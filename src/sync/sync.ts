import { db } from "@/db";
import { supabase } from "@/sync/supabase";

const DEVICE_ID = (() => {
  let id = localStorage.getItem("device_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("device_id", id);
  }
  return id;
})();

class SyncService {
  private userId: string | null = null;
  private realtimeChannel: any = null;
  private pushQueue: Map<string, { table: string; record: any }> = new Map();
  private flushTimeout: ReturnType<typeof setTimeout> | null = null;

  setUserId(id: string | null) {
    this.userId = id;
    if (id) {
      this.initialSync();
      this.subscribeRealtime();
    } else {
      this.realtimeChannel?.unsubscribe();
    }
  }

  // Called when local DB changes — queue the record for push
  queuePush(table: string, record: any) {
    if (!this.userId) return;
    // Keyed by table:id so rapid updates to same record collapse into one push
    this.pushQueue.set(`${table}:${record.id}`, { table, record });
    if (this.flushTimeout) clearTimeout(this.flushTimeout);
    this.flushTimeout = setTimeout(() => this.flushQueue(), 500);
  }

  private async flushQueue() {
    if (!this.userId || this.pushQueue.size === 0) return;
    const batch = Array.from(this.pushQueue.values());
    this.pushQueue.clear();

    // Group by table
    const byTable = new Map<string, any[]>();
    for (const { table, record } of batch) {
      if (!byTable.has(table)) byTable.set(table, []);
      byTable.get(table)!.push(record);
    }

    for (const [table, records] of byTable) {
      const mapped = records.map(r => this.toSupabase(table, r));
      const { error } = await supabase.from(table).upsert(mapped, {
        onConflict: "id",
        ignoreDuplicates: false
      });
      if (error) {
        console.error(`Sync push failed for ${table}:`, error);
        // Re-queue on failure
        records.forEach(r => this.pushQueue.set(`${table}:${r.id}`, { table, record: r }));
      }
    }
  }

  // Only push records newer than their last syncedAt
  private async initialSync() {
    if (!this.userId) return;
    await this.pull();
    await this.pushUnsyncedLocal();
  }

  // Pull only records changed since last pull
  private async pull() {
    if (!this.userId) return;

    const tables: Array<{ dexie: string; supabase: string }> = [
      { dexie: "strokes", supabase: "strokes" },
      { dexie: "canvasElements", supabase: "canvas_elements" },
      { dexie: "pages", supabase: "pages" },
      { dexie: "folders", supabase: "folders" },
      { dexie: "notebooks", supabase: "notebooks" },
    ];

    for (const { dexie: dexieTable, supabase: sbTable } of tables) {
      // Get the last time we pulled this table
      const cursor = await db.appState.get(`sync_cursor_${dexieTable}`);
      const since = cursor?.value ?? new Date(0).toISOString();

      const { data, error } = await supabase
        .from(sbTable)
        .select("*")
        .eq("user_id", this.userId)
        .gt("updated_at", since)
        .order("updated_at", { ascending: true });

      if (error || !data) continue;

      for (const row of data) {
        const local = await (db as any)[dexieTable].get(row.id);
        const remoteUpdated = new Date(row.updated_at).getTime();
        const localUpdated = local?.updatedAt ?? 0;

        if (row.deleted) {
          // Remote deleted — remove locally if it exists
          await (db as any)[dexieTable].delete(row.id);
        } else if (!local || remoteUpdated > localUpdated) {
          // Remote is newer — take remote
          const mapped = this.fromSupabase(dexieTable, row);
          await (db as any)[dexieTable].put(mapped);
        }
        // If local is newer (localUpdated > remoteUpdated), keep local — it'll push in flushQueue
      }

      // Update cursor to the latest updated_at we received
      if (data.length > 0) {
        const latest = data[data.length - 1].updated_at;
        await db.appState.put({ key: `sync_cursor_${dexieTable}`, value: latest, updatedAt: Date.now() });
      }
    }
  }

  // Push local records that haven't been confirmed synced
  private async pushUnsyncedLocal() {
    if (!this.userId) return;

    const tables = ["strokes", "canvasElements", "pages", "folders", "notebooks"] as const;

    for (const table of tables) {
      const sbTable = table === "canvasElements" ? "canvas_elements" : table;
      // Records where syncedAt is missing or older than updatedAt
      const all = await (db as any)[table].toArray();
      const unsynced = all.filter((r: any) => !r.syncedAt || r.syncedAt < r.updatedAt);
      
      if (unsynced.length === 0) continue;

      const chunks = chunk(unsynced, 25);
      for (const c of chunks) {
        const mapped = c.map((r: any) => this.toSupabase(sbTable, r));
        const { error } = await supabase.from(sbTable).upsert(mapped, { onConflict: "id" });
        if (!error) {
          // Mark as synced
          const now = Date.now();
          await (db as any)[table].bulkPut(c.map((r: any) => ({ ...r, syncedAt: now })));
        }
      }
    }
  }

  // Subscribe to Supabase Realtime for live cross-device updates
  private subscribeRealtime() {
    if (!this.userId) return;
    this.realtimeChannel?.unsubscribe();

    this.realtimeChannel = supabase
      .channel(`user-${this.userId}`)
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "strokes",
        filter: `user_id=eq.${this.userId}`,
      }, (payload) => this.handleRealtimeEvent("strokes", payload))
      .on("postgres_changes", {
        event: "*",
        schema: "public",
        table: "canvas_elements",
        filter: `user_id=eq.${this.userId}`,
      }, (payload) => this.handleRealtimeEvent("canvasElements", payload))
      .subscribe();
  }

  private async handleRealtimeEvent(dexieTable: string, payload: any) {
    // Ignore events originating from this device
    if (payload.new?.device_id === DEVICE_ID) return;

    const row = payload.new ?? payload.old;
    if (!row) return;

    if (payload.eventType === "DELETE" || row.deleted) {
      await (db as any)[dexieTable].delete(row.id);
    } else {
      const local = await (db as any)[dexieTable].get(row.id);
      const remoteUpdated = new Date(row.updated_at).getTime();
      if (!local || remoteUpdated > (local.updatedAt ?? 0)) {
        const mapped = this.fromSupabase(dexieTable, row);
        if (mapped) {
          await (db as any)[dexieTable].put(mapped);
        }
      }
    }
  }

  private toSupabase(table: string, r: any): any {
    // Data validation before push to prevent sync corruption
    if (!r.id || typeof r.id !== 'string') throw new Error(`Invalid id for table ${table}`);
    
    const base = {
      id: r.id,
      user_id: this.userId,
      created_at: r.createdAt ? new Date(r.createdAt).toISOString() : undefined,
      updated_at: r.updatedAt ? new Date(r.updatedAt).toISOString() : new Date().toISOString(),
    };
    
    // Add device_id and deleted only for tables that support it
    const withDeviceAndDeleted = {
      ...base,
      device_id: DEVICE_ID,
      deleted: r.deleted ?? false,
    };

    switch (table) {
      case "strokes": return { 
        ...withDeviceAndDeleted, 
        page_id: r.pageId, 
        points: r.points ? pointsToHex(r.points) : null, 
        color: r.color, 
        width: r.strokeWidth ?? r.width,
        pressures: r.pressures,
        shape_type: r.shapeType,
        original_points: r.originalPoints ? pointsToHex(r.originalPoints) : null,
        stroke_style: r.strokeStyle,
        background_color: r.backgroundColor,
        opacity: r.opacity,
        edges: r.edges,
        sloppiness: r.sloppiness
      };
      case "canvas_elements": return { ...withDeviceAndDeleted, page_id: r.pageId, type: r.type, x: r.x, y: r.y, width: r.width, height: r.height, rotation: r.rotation, z_index: r.zIndex, data: r.data };
      case "pages": return { ...base, notebook_id: r.notebookId, title: r.title, type: r.type, settings: r.settings, page_index: r.pageIndex || 0, deleted: r.deleted ?? false };
      case "folders": return { ...base, parent_id: r.parentId, name: r.name, deleted: r.deleted ?? false };
      case "notebooks": return { ...base, folder_id: r.folderId, name: r.name, deleted: r.deleted ?? false };
      default: return { ...base, ...r };
    }
  }

  private fromSupabase(dexieTable: string, row: any): any {
    // Data validation to prevent corruption from incoming sync data
    if (!row.id || typeof row.id !== 'string') {
      console.warn(`Invalid incoming sync data: missing id`, row);
      return null;
    }
    
    const base = {
      id: row.id,
      userId: row.user_id,
      createdAt: row.created_at ? new Date(row.created_at).getTime() : Date.now(),
      updatedAt: row.updated_at ? new Date(row.updated_at).getTime() : Date.now(),
      syncedAt: Date.now(),
      deleted: row.deleted ?? false,
    };
    switch (dexieTable) {
      case "strokes": return { 
        ...base, 
        pageId: row.page_id, 
        points: parsePoints(row.points), 
        color: row.color, 
        strokeWidth: row.width, 
        width: 0, 
        height: 0,
        pressures: row.pressures || [],
        shapeType: row.shape_type,
        originalPoints: row.original_points ? parsePoints(row.original_points) : undefined,
        strokeStyle: row.stroke_style,
        backgroundColor: row.background_color,
        opacity: row.opacity,
        edges: row.edges,
        sloppiness: row.sloppiness
      };
      case "canvasElements": return { ...base, pageId: row.page_id, type: row.type, x: row.x, y: row.y, width: row.width, height: row.height, rotation: row.rotation, zIndex: row.z_index, data: row.data };
      case "pages": return { ...base, notebookId: row.notebook_id, title: row.title, type: row.type, settings: row.settings, pageIndex: row.page_index };
      case "folders": return { ...base, parentId: row.parent_id, name: row.name };
      case "notebooks": return { ...base, folderId: row.folder_id, name: row.name };
      default: return { ...base, ...row };
    }
  }
}

function pointsToHex(points: number[] | Uint8Array): string {
  let str = "";
  if (points instanceof Uint8Array) {
    str = new TextDecoder().decode(points);
  } else {
    str = JSON.stringify(points);
  }
  let hex = "\\x";
  for (let i = 0; i < str.length; i++) {
    hex += str.charCodeAt(i).toString(16).padStart(2, "0");
  }
  return hex;
}

function chunk<T>(arr: T[], size: number): T[][] {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += size) out.push(arr.slice(i, i + size));
  return out;
}

function parsePoints(points: any): number[] {
  if (Array.isArray(points)) return points;
  if (typeof points === "string") {
    if (points.startsWith("\\x")) {
      const hex = points.slice(2);
      let str = "";
      for (let i = 0; i < hex.length; i += 2) str += String.fromCharCode(parseInt(hex.substr(i, 2), 16));
      try { return JSON.parse(str); } catch { return []; }
    }
    try { return JSON.parse(points); } catch { return []; }
  }
  return [];
}

export const syncService = new SyncService();