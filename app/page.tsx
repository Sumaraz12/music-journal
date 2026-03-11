"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import type { User } from "@supabase/supabase-js";

type Entry = {
  id: number;
  title: string;
  artist: string;
  notes: string | null;
  created_at: string | null;
  user_id: string;
};

export default function Home() {
  const [user, setUser] = useState<User | null>(null);

  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");

  const [title, setTitle] = useState<string>("");
  const [artist, setArtist] = useState<string>("");
  const [notes, setNotes] = useState<string>("");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState<string>("");
  const [editingId, setEditingId] = useState<number | null>(null);

  async function getUser(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);
  }

  async function signUp(): Promise<void> {
    if (!email.trim() || !password.trim()) {
      setMessage("Please enter email and password.");
      return;
    }

    const { error } = await supabase.auth.signUp({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      console.error("Signup error:", error);
      setMessage(error.message);
      return;
    }

    setMessage("Signup successful. You can now log in.");
  }

  async function signIn(): Promise<void> {
    if (!email.trim() || !password.trim()) {
      setMessage("Please enter email and password.");
      return;
    }

    const { error } = await supabase.auth.signInWithPassword({
      email: email.trim(),
      password: password.trim(),
    });

    if (error) {
      console.error("Login error:", error);
      setMessage(error.message);
      return;
    }

    setMessage("Logged in successfully.");
    await getUser();
  }

  async function signOut(): Promise<void> {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setMessage("Could not log out.");
      return;
    }

    setUser(null);
    setEntries([]);
    setMessage("Logged out.");
  }

  async function fetchEntries(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setEntries([]);
      return;
    }

    const { data, error } = await supabase
      .from("entries")
      .select("*")
      .eq("user_id", user.id)
      .order("created_at", { ascending: false });

    if (error) {
      console.error("Fetch error:", error);
      setMessage("Could not load entries.");
      return;
    }

    setEntries((data as Entry[]) || []);
    setMessage("");
  }

  async function addOrUpdateEntry(): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please log in first.");
      return;
    }

    if (!title.trim() || !artist.trim()) {
      setMessage("Please enter both song title and artist.");
      return;
    }

    if (editingId !== null) {
      const { error } = await supabase
        .from("entries")
        .update({
          title: title.trim(),
          artist: artist.trim(),
          notes: notes.trim() || null,
        })
        .eq("id", editingId)
        .eq("user_id", user.id);

      if (error) {
        console.error("Update error:", error);
        setMessage("Could not update entry.");
        return;
      }

      setMessage("Entry updated!");
      setEditingId(null);
    } else {
      const { error } = await supabase.from("entries").insert([
        {
          title: title.trim(),
          artist: artist.trim(),
          notes: notes.trim() || null,
          user_id: user.id,
        },
      ]);

      if (error) {
        console.error("Insert error:", error);
        setMessage("Could not save entry.");
        return;
      }

      setMessage("Entry saved!");
    }

    setTitle("");
    setArtist("");
    setNotes("");

    await fetchEntries();
  }

  function editEntry(entry: Entry): void {
    setEditingId(entry.id);
    setTitle(entry.title);
    setArtist(entry.artist);
    setNotes(entry.notes ?? "");
    setMessage("Editing entry...");
  }

  function cancelEdit(): void {
    setEditingId(null);
    setTitle("");
    setArtist("");
    setNotes("");
    setMessage("Edit cancelled.");
  }

  async function deleteEntry(id: number): Promise<void> {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (!user) {
      setMessage("Please log in first.");
      return;
    }

    const { error } = await supabase
      .from("entries")
      .delete()
      .eq("id", id)
      .eq("user_id", user.id);

    if (error) {
      console.error("Delete error:", error);
      setMessage("Could not delete entry.");
      return;
    }

    setMessage("Entry deleted.");

    if (editingId === id) {
      cancelEdit();
    }

    await fetchEntries();
  }

  useEffect(() => {
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange(async (_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        await fetchEntries();
      } else {
        setEntries([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    if (user) {
      fetchEntries();
    }
  }, [user]);

  return (
    <main style={{ padding: "40px", maxWidth: "700px", margin: "auto" }}>
      <h1>🎵 Music Journal</h1>

      {!user ? (
        <div style={{ marginTop: "20px", marginBottom: "30px" }}>
          <h2>Login / Signup</h2>

          <input
            type="email"
            placeholder="Email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={{
              padding: "10px",
              width: "100%",
              marginBottom: "10px",
              border: "1px solid #ccc",
            }}
          />

          <input
            type="password"
            placeholder="Password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            style={{
              padding: "10px",
              width: "100%",
              marginBottom: "10px",
              border: "1px solid #ccc",
            }}
          />

          <button
            onClick={signUp}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
              marginRight: "10px",
            }}
          >
            Sign Up
          </button>

          <button
            onClick={signIn}
            style={{
              padding: "10px 20px",
              cursor: "pointer",
            }}
          >
            Log In
          </button>

          {message && <p>{message}</p>}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "20px" }}>
            <p>
              Logged in as: <strong>{user.email}</strong>
            </p>
            <button
              onClick={signOut}
              style={{
                padding: "10px 20px",
                cursor: "pointer",
              }}
            >
              Log Out
            </button>
          </div>

          <div style={{ marginTop: "20px" }}>
            <input
              placeholder="Song title"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              style={{
                padding: "10px",
                width: "100%",
                marginBottom: "10px",
                border: "1px solid #ccc",
              }}
            />

            <input
              placeholder="Artist"
              value={artist}
              onChange={(e) => setArtist(e.target.value)}
              style={{
                padding: "10px",
                width: "100%",
                marginBottom: "10px",
                border: "1px solid #ccc",
              }}
            />

            <textarea
              placeholder="Notes or YouTube link..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              style={{
                padding: "10px",
                width: "100%",
                marginBottom: "10px",
                border: "1px solid #ccc",
                minHeight: "100px",
              }}
            />

            <button
              onClick={addOrUpdateEntry}
              style={{
                padding: "10px 20px",
                cursor: "pointer",
                marginRight: "10px",
              }}
            >
              {editingId !== null ? "Update Entry" : "Save Entry"}
            </button>

            {editingId !== null && (
              <button
                onClick={cancelEdit}
                style={{
                  padding: "10px 20px",
                  cursor: "pointer",
                }}
              >
                Cancel
              </button>
            )}

            {message && <p>{message}</p>}
          </div>

          <hr style={{ margin: "30px 0" }} />

          <h2>Your Entries</h2>

          {entries.length === 0 ? (
            <p>No entries yet.</p>
          ) : (
            entries.map((entry) => (
              <div
                key={entry.id}
                style={{
                  border: "1px solid #ccc",
                  padding: "12px",
                  marginBottom: "12px",
                  borderRadius: "6px",
                }}
              >
                <strong>{entry.title}</strong>
                <p>Artist: {entry.artist}</p>

                <p>
                  Notes:{" "}
                  {entry.notes?.startsWith("http") ? (
                    <a
                      href={entry.notes}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      Open Link
                    </a>
                  ) : (
                    entry.notes ?? ""
                  )}
                </p>

                <small>
                  {entry.created_at
                    ? new Date(entry.created_at).toLocaleString()
                    : "No date yet"}
                </small>

                <div style={{ marginTop: "10px" }}>
                  <button
                    onClick={() => editEntry(entry)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      marginRight: "10px",
                      background: "#4d79ff",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    onClick={() => deleteEntry(entry.id)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      background: "#ff4d4d",
                      color: "white",
                      border: "none",
                      borderRadius: "4px",
                    }}
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))
          )}
        </>
      )}
    </main>
  );
}