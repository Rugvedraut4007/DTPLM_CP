import { useState } from "react";

import API from "../lib/api.js";
import useAsync from "../lib/useAsync.js";
import { initials, timeAgo } from "../lib/format.js";
import { useApp } from "../state/AppContext.jsx";
import { DataView, Empty } from "../components/UI.jsx";

export default function Friends() {
  const { userId, toast } = useApp();
  const [pick, setPick] = useState("");
  const [busy, setBusy] = useState(false);

  const query = useAsync(async () => {
    const [friends, requests, lb] = await Promise.all([
      API.get("/api/users/" + userId + "/friends"),
      API.get("/api/users/" + userId + "/friend-requests"),
      API.get("/api/leaderboard?limit=50").catch(() => [])
    ]);
    return { friends: friends || [], requests: requests || [], lb: lb || [] };
  }, [userId]);

  async function accept(id, reload) {
    try {
      await API.post("/api/friends/requests/" + id + "/accept?userId=" + userId);
      toast("Friend added", "ok");
      reload();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  async function reject(id, reload) {
    try {
      await API.post("/api/friends/requests/" + id + "/reject?userId=" + userId);
      toast("Request declined", "warn");
      reload();
    } catch (e) {
      toast(e.message, "err");
    }
  }

  async function add(candidates, reload) {
    const id = Number(pick);
    if (!id) return;
    const chosen = candidates.find((c) => c.userId === id);
    const name = chosen ? chosen.username : "student";
    setBusy(true);
    try {
      await API.post("/api/friends/requests", {
        senderUserId: userId,
        receiverUserId: id,
        receiverName: name
      });
      toast("Friend request sent to " + name, "ok");
      setPick("");
      reload();
    } catch (e) {
      toast(e.message, "err");
    }
    setBusy(false);
  }

  return (
    <DataView query={query}>
      {({ friends, requests, lb }, reload) => {
        const friendIds = new Set(friends.map((f) => f.id || f.userId));
        friendIds.add(userId);

        const incoming = requests
          .filter((r) => (r.sender && r.sender.id ? r.sender.id !== userId : !r.outgoing))
          .map((r) => {
            const name = r.senderName || (r.sender && r.sender.username) || "student";
            const id = r.id || r.requestId;
            return (
              <div className="friend-row" key={id}>
                <div className="friend-who">
                  <span className="avatar">{initials(name)}</span>
                  <div>
                    <b>{name}</b>
                    <div className="small muted">wants to be friends · {timeAgo(r.createdAt)}</div>
                  </div>
                </div>
                <div className="row" style={{ gap: 8 }}>
                  <button className="btn sm success" onClick={() => accept(id, reload)}>
                    Accept
                  </button>
                  <button className="btn sm ghost" onClick={() => reject(id, reload)}>
                    Decline
                  </button>
                </div>
              </div>
            );
          });

        const friendRows = friends.map((f) => {
          const name = f.username || f.name;
          const id = f.id || f.userId;
          return (
            <div className="friend-row" key={id}>
              <div className="friend-who">
                <span className="avatar">{initials(name)}</span>
                <div>
                  <b>{name}</b>
                  <div className="small muted">studying together</div>
                </div>
              </div>
              <span className="pill green">✓ friends</span>
            </div>
          );
        });

        const candidates = lb.filter((e) => !friendIds.has(e.userId));

        return (
          <div className="split">
            <div className="card">
              <h3>
                Friends{" "}
                <span className="muted" style={{ textTransform: "none", letterSpacing: 0 }}>
                  {friends.length} friends
                </span>
              </h3>
              {friendRows.length ? friendRows : <Empty icon="👥">No friends yet.</Empty>}
            </div>

            <div className="card column">
              <h3>Pending requests</h3>
              {incoming.length ? (
                incoming
              ) : (
                <Empty icon="✉">No pending requests.</Empty>
              )}
              <div className="push">
                <div className="field" style={{ marginBottom: 10 }}>
                  <label>Add a student</label>
                  <select value={pick} onChange={(e) => setPick(e.target.value)}>
                    {candidates.length ? (
                      candidates.map((e) => (
                        <option key={e.userId} value={e.userId}>
                          {e.username} · {e.xp} XP
                        </option>
                      ))
                    ) : (
                      <option value="">— nobody left to add —</option>
                    )}
                  </select>
                </div>
                <button
                  className="btn"
                  style={{ width: "100%" }}
                  disabled={!candidates.length || busy}
                  onClick={() => add(candidates, reload)}
                >
                  + Send request
                </button>
                <div className="small muted" style={{ marginTop: 10 }}>
                  Find classmates from the leaderboard.
                </div>
              </div>
            </div>
          </div>
        );
      }}
    </DataView>
  );
}
