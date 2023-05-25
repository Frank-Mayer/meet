import { panic } from "./error";
import { getRoom } from "./fb";

console.log("index.ts");

// generate room id
const roomIdEl = document.getElementById("room_id") as HTMLInputElement | null;
if (!roomIdEl) {
    panic("No room id element");
}

const createFormEl = document.getElementById(
    "create_form",
) as HTMLFormElement | null;
if (!createFormEl) {
    panic("No create form element");
}

const titleEl = document.getElementById("title") as HTMLInputElement | null;
if (!titleEl) {
    panic("No title element");
}

const startEl = document.getElementById("start") as HTMLInputElement | null;
if (!startEl) {
    panic("No start element");
}

const endEl = document.getElementById("end") as HTMLInputElement | null;
if (!endEl) {
    panic("No end element");
}

const guid =
    Date.now().toString(36) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15) +
    Math.random().toString(36).substring(2, 15);

roomIdEl.value = guid;

const today = new Date();
const nextWeek = new Date(today.getTime() + 7 * 24 * 60 * 60 * 1000);
const getIsoTimeNoSeconds = (date: Date) => date.toISOString().substring(0, 16);

startEl.value = getIsoTimeNoSeconds(today);
endEl.value = getIsoTimeNoSeconds(nextWeek);

createFormEl.addEventListener("submit", (event) => {
    event.preventDefault();
    getRoom(guid, {
        title: titleEl.value,
        start: startEl.value,
        end: endEl.value,
    })
        .then(() => {
            window.location.assign(`/vote.html?room=${guid}`);
        })
        .catch(panic);
});
