import { panic } from "./error";
import {
    Vote,
    addUser,
    getAllVotes,
    getMeta,
    getUsers,
    getVotes,
    setVotes,
} from "./fb";
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
const outputEl = document.getElementById("output") as HTMLTableElement;
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

if (!outputEl) {
    panic("No output element");
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

async function updateOutput() {
    const votes = await getAllVotes(room!);
    outputEl.innerHTML = "";

    type UserVote = {
        start: number;
        end: number;
        users: Set<string>;
    };
    const ranking = new Array<UserVote>();

    const votesToProcess = new Array<UserVote>();
    for (const user in votes) {
        for (const vote of votes[user]) {
            votesToProcess.push({
                start: new Date(vote.from).getTime(),
                end: new Date(vote.to).getTime(),
                users: new Set<string>([user]),
            });
        }
    }

    merge_votes: while (votesToProcess.length > 0) {
        const vote = votesToProcess.pop()!;
        for (const existingVote of ranking) {
            if (
                vote.end <= existingVote.start ||
                existingVote.end <= vote.start
            ) {
                continue;
            }

            // check start
            if (vote.start < existingVote.start) {
                votesToProcess.push({
                    start: vote.start,
                    end: existingVote.start,
                    users: cloneSet(vote.users),
                });
                vote.start = existingVote.start;
            } else if (existingVote.start < vote.start) {
                votesToProcess.push({
                    start: existingVote.start,
                    end: vote.start,
                    users: cloneSet(existingVote.users),
                });
            }

            // check end
            if (vote.end < existingVote.end) {
                votesToProcess.push({
                    start: vote.end,
                    end: existingVote.end,
                    users: cloneSet(existingVote.users),
                });
                existingVote.end = vote.end;
                for (const user of vote.users) {
                    existingVote.users.add(user);
                }
            } else if (existingVote.end < vote.end) {
                votesToProcess.push({
                    start: existingVote.end,
                    end: vote.end,
                    users: vote.users,
                });
                for (const user of vote.users) {
                    existingVote.users.add(user);
                }
            } else {
                for (const user of vote.users) {
                    existingVote.users.add(user);
                }
            }

            continue merge_votes;
        }

        ranking.push(vote);
    }

    // sort by most users then by largest time range
    ranking.sort((a, b) => {
        if(a.users.size > b.users.size) {
            return -1;
        }
        if(a.users.size < b.users.size) {
            return 1;
        }
        if(a.end - a.start > b.end - b.start) {
            return -1;
        }
        if(a.end - a.start < b.end - b.start) {
            return 1;
        }
        return 0;
    });

    for (const vote of ranking) {
        const start = new Date(vote.start);
        const end = new Date(vote.end);
        const users = Array.from(vote.users)
            .sort((a, b) => a.localeCompare(b))
            .join(", ");
        const voteEl = document.createElement("tr");
        outputEl.appendChild(voteEl);
        const startEl = document.createElement("td");
        startEl.headers="th_start";
        startEl.innerText = start.toLocaleString();
        voteEl.appendChild(startEl);
        const endEl = document.createElement("td");
        endEl.headers="th_end";
        endEl.innerText = end.toLocaleString();
        voteEl.appendChild(endEl);
        const usersEl = document.createElement("td");
        usersEl.headers="th_users";
        usersEl.innerText = users;
        voteEl.appendChild(usersEl);
    }
}

function cloneSet(set: Set<string>) {
    return new Set<string>(set);
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
    updateOutput();
});

Promise.all([
    getUsers(room)
        .then(async (usersData) => {
            for (const user in usersData) {
                users.add(user);
            }
            updateUsers(await kvStore.get(userKey));
        })
        .catch(panic),
    getMeta(room)
        .then(async (meta) => {
            minDate = meta.start;
            maxDate = meta.end;
            const titleEl = document.getElementById("title");
            if (titleEl) {
                titleEl.innerText = `Meet: "${meta.title}"`;
            }
        })
        .catch(panic),
]).then(() => {
    updateOutput();
});
