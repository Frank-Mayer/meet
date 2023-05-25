import { initializeApp } from "firebase/app";
import {
    getFirestore,
    collection,
    doc,
    setDoc,
    getDoc,
} from "firebase/firestore";
import { panic } from "./error";

// Your web app's Firebase configuration
const firebaseConfig = {
    apiKey: "AIzaSyC9sshzAX6ZUwLVVoORz7A6LfS_8nEBFhw",
    authDomain: "meet--now.firebaseapp.com",
    projectId: "meet--now",
    storageBucket: "meet--now.appspot.com",
    messagingSenderId: "302409493880",
    appId: "1:302409493880:web:cbe109600231fc1034ec8d",
};

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const fs = getFirestore(app);

export type RoomMeta = {
    title: string;
    start: string;
    end: string;
};

export type Vote = {
    from: string;
    to: string;
};

/** ensure that room exists and return it */
export async function getRoom (collectionName: string, meta?: RoomMeta) {
    const room = collection(fs, collectionName);
    if (meta) {
        const roomMeta = doc(room, "meta");
        await setDoc(roomMeta, meta);
    }
    return room;
};

/** get users in the room */
export async function getUsers (roomLocation: string) {
    const room = await getRoom(roomLocation);
    const users = doc(room, "users");
    const usersData = await getDoc(users);
    return usersData.data();
};

/** add user to the room */
export async function addUser (roomLocation: string, user: string) {
    const room = await getRoom(roomLocation);
    const users = doc(room, "users");
    const usersData = await getDoc(users);
    const usersDataData = usersData.data();
    const newUsers = { ...usersDataData, [user]: [] };
    await setDoc(users, newUsers);
};

/** set votes of user in room */
export async function setVotes (roomLocation: string, user: string, votes: Array<Vote>) {
    const room = await getRoom(roomLocation);
    const users = doc(room, "users");
    const usersData = await getDoc(users);
    const usersDataData = usersData.data();
    const newUsers = { ...usersDataData, [user]: votes };
    await setDoc(users, newUsers);
}

/** get votes of user in room */
export async function getVotes (roomLocation: string, user: string): Promise<Array<Vote>> {
    const room = await getRoom(roomLocation);
    const users = doc(room, "users");
    const usersData = await getDoc(users);
    const usersDataData = usersData.data() ?? panic("users not found");
    return usersDataData[user] ?? panic("user not found");
}

/** get meta of room */
export async function getMeta (roomLocation: string): Promise<RoomMeta> {
    const room = await getRoom(roomLocation);
    const meta = doc(room, "meta");
    const metaDoc = await getDoc(meta);
    return metaDoc.data() as RoomMeta;
}
