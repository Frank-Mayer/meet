import { openDB } from "idb";

const table = "kv_01";

const dbPromise = openDB("kv_store", 1, {
    upgrade(db) {
        db.createObjectStore(table);
    },
});

export const kvStore = {
    async get(key: string) {
        const db = await dbPromise;
        return db.get(table, key);
    },

    async set(key: string, val: string) {
        const db = await dbPromise;
        return db.put(table, val, key);
    },

    async delete(key: string) {
        const db = await dbPromise;
        return db.delete(table, key);
    },

    async clear() {
        const db = await dbPromise;
        return db.clear(table);
    },

    async has(key: string) {
        const db = await dbPromise;
        return (await db.get(table, key)) !== undefined;
    },
};
