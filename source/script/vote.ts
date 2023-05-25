import { panic } from "./error";
import { Vote, addUser, getMeta, getUsers, getVotes, setVotes } from "./fb";
import { kvStore } from "./kvStore";

const users = new Set<string>();
const url = new URL(window.location.href);
const room = url.searchParams.get("room");
const addUserEl = document.getElementById("add_user") as HTMLInputElement;
const addUserFormEl = document.getElementById(
    "add_user_form",
) as HTMLFormElement;
const usersEl = document.getElementById("user") as HTMLSelectElement;
const myVotesListEl = document.getElementById("my_votes");
const addVoteEl = document.getElementById("add_vote");
const saveVotesEl = document.getElementById("save_votes");
let minDate = new Date().toISOString().slice(0, 16);
let maxDate = new Date().toISOString().slice(0, 16);

if (!addUserEl || !addUserFormEl) {
    panic("No add user element");
}

if (!room) {
    panic("No room specified", "/");
}

if (!usersEl) {
    panic("No users element");
}

if (!myVotesListEl) {
    panic("No my votes list element");
}

if (!addVoteEl) {
    panic("No add vote element");
}

if (!saveVotesEl) {
    panic("No save votes element");
}

const userKey = `user-${room}`;

function updateUsers(setTo?: string) {
    usersEl.innerHTML = "";
    for (const user of users) {
        const optionEl = document.createElement("option");
        optionEl.value = user;
        optionEl.innerText = user;
        usersEl.appendChild(optionEl);
    }
    if (setTo) {
        usersEl.value = setTo;
        updateVotes(setTo);
    }
}

async function updateVotes(user: string) {
    const votes = await getVotes(room!, user);
    myVotesListEl!.innerHTML = "";
    for (const vote of votes) {
        myVotesListEl!.appendChild(createNewVoteEl(vote));
    }
}

function createNewVoteEl(vote?: Vote) {
    const newVoteEl = document.createElement("div");

    const fromTextEl = document.createElement("label");
    fromTextEl.innerText = "From: ";
    newVoteEl.appendChild(fromTextEl);

    const fromEl = document.createElement("input");
    fromEl.required = true;
    fromEl.type = "datetime-local";
    fromEl.name = "from";
    fromEl.min = minDate;
    fromEl.max = maxDate;
    fromTextEl.appendChild(fromEl);

    const toTextEl = document.createElement("label");
    toTextEl.innerText = "To: ";
    newVoteEl.appendChild(toTextEl);

    const toEl = document.createElement("input");
    toEl.required = true;
    toEl.type = "datetime-local";
    toEl.name = "to";
    toEl.min = minDate;
    toEl.max = maxDate;
    toTextEl.appendChild(toEl);

    const removeEl = document.createElement("button");
    removeEl.innerText = "Remove";
    removeEl.addEventListener("click", () => {
        newVoteEl.remove();
    });
    newVoteEl.appendChild(removeEl);

    if (vote) {
        fromEl.value = vote.from;
        toEl.value = vote.to;
    }

    return newVoteEl;
}

addUserFormEl.addEventListener("submit", async (event) => {
    event.preventDefault();
    const newUser = addUserEl.value.trim();
    if (!newUser) {
        return;
    }

    await addUser(room, newUser);
    users.add(newUser);
    updateUsers(newUser);
    kvStore.set(userKey, newUser);
});

usersEl.addEventListener("change", async () => {
    const newUser = usersEl.value;
    if (newUser) {
        await kvStore.set(userKey, newUser);
        updateVotes(newUser);
    }
});

addVoteEl.addEventListener("click", () => {
    myVotesListEl.appendChild(createNewVoteEl());
});

saveVotesEl.addEventListener("click", async () => {
    const votes = new Array<{ from: string; to: string }>();
    for (const voteEl of myVotesListEl.children) {
        const fromEl = voteEl.querySelector(
            "input[name=from]",
        ) as HTMLInputElement;
        const toEl = voteEl.querySelector("input[name=to]") as HTMLInputElement;
        if (!fromEl || !toEl) {
            continue;
        }
        if (!fromEl.value || !toEl.value) {
            alert(
                "Invalid vote, please fill in all fields or remove fields that are not needed",
            );
            return;
        }
        votes.push({ from: fromEl.value, to: toEl.value });
    }
    await setVotes(room, usersEl.value, votes);
    alert("Votes saved");
});

getUsers(room)
    .then(async (usersData) => {
        for (const user in usersData) {
            users.add(user);
        }
        updateUsers(await kvStore.get(userKey));
    })
    .catch(panic);

getMeta(room)
    .then(async (meta) => {
        minDate = meta.start;
        maxDate = meta.end;
        const titleEl = document.getElementById("title");
        if (titleEl) {
            titleEl.innerText = `Meet: "${meta.title}"`;
        }
    })
    .catch(panic);
