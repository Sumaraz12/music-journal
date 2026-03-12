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

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [title, setTitle] = useState("");
  const [artist, setArtist] = useState("");
  const [notes, setNotes] = useState("");

  const [entries, setEntries] = useState<Entry[]>([]);
  const [message, setMessage] = useState("");
  const [editingId, setEditingId] = useState<number | null>(null);

  async function getUser() {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    setUser(user);
  }

  async function signUp() {
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

  async function signIn() {
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
    await fetchEntries();
  }

  async function signOut() {
    const { error } = await supabase.auth.signOut();

    if (error) {
      console.error("Logout error:", error);
      setMessage(error.message);
      return;
    }

    setUser(null);
    setEntries([]);
    setMessage("Logged out.");
  }

  async function fetchEntries() {
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
      setMessage(error.message);
      return;
    }

    setEntries((data as Entry[]) || []);
  }

  async function addOrUpdateEntry() {
    console.log("Save button clicked");

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
        setMessage(error.message);
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
        setMessage(error.message);
        return;
      }

      setMessage("Entry saved!");
    }

    setTitle("");
    setArtist("");
    setNotes("");
    await fetchEntries();
  }

  function editEntry(entry: Entry) {
    setEditingId(entry.id);
    setTitle(entry.title);
    setArtist(entry.artist);
    setNotes(entry.notes ?? "");
    setMessage("Editing entry...");
  }

  function cancelEdit() {
    setEditingId(null);
    setTitle("");
    setArtist("");
    setNotes("");
    setMessage("Edit cancelled.");
  }

  async function deleteEntry(id: number) {
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
      setMessage(error.message);
      return;
    }

    if (editingId === id) {
      cancelEdit();
    }

    setMessage("Entry deleted.");
    await fetchEntries();
  }

  useEffect(() => {
    getUser();

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);

      if (session?.user) {
        fetchEntries();
      } else {
        setEntries([]);
      }
    });

    return () => {
      subscription.unsubscribe();
    };
  }, []);

  return (
    <main style={{ padding: "40px", maxWidth: "700px", margin: "0 auto" }}>
      <h1>🎵 Music Journal</h1>

      {!user ? (
        <div style={{ marginTop: "20px", marginBottom: "30px" }}>
          <h2>Login / Signup</h2>

          <input
            id="email"
            name="email"
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
            id="password"
            name="password"
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
            type="button"
            onClick={signUp}
            style={{ padding: "10px 20px", marginRight: "10px", cursor: "pointer" }}
          >
            Sign Up
          </button>

          <button
            type="button"
            onClick={signIn}
            style={{ padding: "10px 20px", cursor: "pointer" }}
          >
            Log In
          </button>

          {message ? <p>{message}</p> : null}
        </div>
      ) : (
        <>
          <div style={{ marginBottom: "20px" }}>
            <p>
              Logged in as: <strong>{user.email}</strong>
            </p>

            <button
              type="button"
              onClick={signOut}
              style={{ padding: "10px 20px", cursor: "pointer" }}
            >
              Log Out
            </button>
          </div>

          <div style={{ marginTop: "20px" }}>
            <input
              id="title"
              name="title"
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
              id="artist"
              name="artist"
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
              id="notes"
              name="notes"
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
              type="button"
              onClick={addOrUpdateEntry}
              style={{
                padding: "10px 20px",
                marginRight: "10px",
                cursor: "pointer",
                backgroundColor: "#222",
                color: "#fff",
                border: "none",
                borderRadius: "4px",
              }}
            >
              {editingId !== null ? "Update Entry" : "Save Entry"}
            </button>

            {editingId !== null ? (
              <button
                type="button"
                onClick={cancelEdit}
                style={{ padding: "10px 20px", cursor: "pointer" }}
              >
                Cancel
              </button>
            ) : null}

            {message ? <p>{message}</p> : null}
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
                  {entry.notes && entry.notes.startsWith("http") ? (
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
                    type="button"
                    onClick={() => editEntry(entry)}
                    style={{
                      padding: "6px 12px",
                      marginRight: "10px",
                      cursor: "pointer",
                      backgroundColor: "#4d79ff",
                      color: "#fff",
                      border: "none",
                      borderRadius: "4px",
                    }}
                  >
                    Edit
                  </button>

                  <button
                    type="button"
                    onClick={() => deleteEntry(entry.id)}
                    style={{
                      padding: "6px 12px",
                      cursor: "pointer",
                      backgroundColor: "#ff4d4d",
                      color: "#fff",
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