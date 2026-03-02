import { db } from "./db";

export async function seedIfEmpty() {
    const folderCount = await db.folders.count();

    if (folderCount > 0) return;

    const semesterId = crypto.randomUUID();
    const notebookId = crypto.randomUUID();
    const pageId = crypto.randomUUID();

    await db.folders.add({
        id: semesterId,
        name: "semestre 6",
        parentId: null,
        createdAt: Date.now(),
    });

    await db.notebooks.add({
        id: notebookId,
        name: "Inteligencia Artificial",
        folderId: semesterId,
        createdAt: Date.now(),
    });

    await db.pages.add({
        id: pageId,
        notebookId,
        title: new Date().toISOString().split("T")[0],
        type: "canvas",
        createdAt: Date.now(),
        updatedAt: Date.now(),
        settings: {
            size: "A4",
            orientation: "portrait",
            grid: "squared",
            zoom: 1,
        }
    });

    await db.appState.put({
        key: "activePageId",
        value: pageId,
        updatedAt: Date.now(),
    });
}
