import { useState, useEffect } from "react";

export default function UI() {
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [notes, setNotes] = useState([]);
  const [globalTopTags, setGlobalTopTags] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [loading, setLoading] = useState(true);

  const API_BASE = "https://tagclassifier-production.up.railway.app";

  useEffect(() => {
    const fetchNotes = async () => {
      try {
        const res = await fetch(`${API_BASE}/notes`);
        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }
        const data = await res.json();
        console.log("Fetched notes:", data);
        setNotes(data);
        calculateGlobalTopTags(data);
      } catch (err) {
        console.error("Error fetching notes:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchNotes();
  }, []);

  // Calculate global top tags from all notes
  const calculateGlobalTopTags = (notesData) => {
    if (!notesData || !Array.isArray(notesData)) return;

    const allTags = notesData.flatMap(note =>
      (note.tags || []).map(tag => ({
        label: tag.label,
        score: tag.score,
        noteId: note._id
      }))
    );

    const tagMap = {};
    allTags.forEach(tag => {
      if (!tagMap[tag.label]) {
        tagMap[tag.label] = {
          label: tag.label,
          totalScore: 0,
          count: 0,
          notes: new Set()
        };
      }
      tagMap[tag.label].totalScore += tag.score;
      tagMap[tag.label].count += 1;
      tagMap[tag.label].notes.add(tag.noteId);
    });

    const globalTags = Object.values(tagMap)
      .map(tag => ({
        label: tag.label,
        averageScore: tag.totalScore / tag.count,
        frequency: tag.count,
        noteCount: tag.notes.size
      }))
      .sort((a, b) => b.averageScore * b.frequency - a.averageScore * a.frequency)
      .slice(0, 10);

    setGlobalTopTags(globalTags);
  };

  // Add / Update note
  const handleSubmit = async (e) => {
    e.preventDefault();

    try {
      let res, data;

      if (editingId) {
        // Update (PATCH)
        res = await fetch(`${API_BASE}/notes/${editingId}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        data = await res.json();
        console.log("Update response:", data);

        if (data.data) {
          setNotes(prev => {
            const updated = prev.map(n => n._id === editingId ? data.data : n);
            calculateGlobalTopTags(updated);
            return updated;
          });
        }
        setEditingId(null);
      } else {
        // Create (POST)
        res = await fetch(`${API_BASE}/notes`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ title, description }),
        });

        if (!res.ok) {
          throw new Error(`HTTP error! status: ${res.status}`);
        }

        data = await res.json();
        console.log("Create response:", data);

        if (data.data) {
          setNotes(prev => {
            const updated = [data.data, ...prev];
            calculateGlobalTopTags(updated);
            return updated;
          });
        }
      }

      // Reset form
      setTitle("");
      setDescription("");
    } catch (err) {
      console.error("Error saving note:", err);
      alert("Error saving note: " + err.message);
    }
  };

  // Delete note
  const handleDelete = async (id) => {
    try {
      const res = await fetch(`${API_BASE}/notes/${id}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errorData = await res.json();
        throw new Error(errorData.message || `HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Delete response:", data);

      setNotes(prev => {
        const updated = prev.filter(n => n._id !== id);
        calculateGlobalTopTags(updated);
        return updated;
      });
    } catch (err) {
      console.error("Delete error:", err);
      alert("Error deleting note: " + err.message);
    }
  };

  // Edit note (fill form)
  const handleEdit = (note) => {
    setTitle(note.title);
    setDescription(note.description);
    setEditingId(note._id);
  };

  // Real-time tag preview 
  const fetchTags = async (text) => {
    try {
      if (!text) {
        return;
      }

      const res = await fetch(`${API_BASE}/notes/tags/generate-tags`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ text })
      });

      if (!res.ok) {
        throw new Error(`HTTP error! status: ${res.status}`);
      }

      const data = await res.json();
      console.log("Real-time tags preview:", data);
    } catch (err) {
      console.error("Error fetching tags for preview:", err);

    }
  };

  return (
    <div className="min-h-screen bg-gray-50 p-6 flex">
      {/* Left: Notes Section */}
      <div className="flex-1">
        <h1 className="text-3xl font-bold text-indigo-600 mb-4">
          📝 Smart Notes with AI Tags
        </h1>

        {/* Add / Update Note Form */}
        <form
          onSubmit={handleSubmit}
          className="bg-white shadow-lg p-4 rounded-lg mb-6"
        >
          <input
            type="text"
            placeholder="Title"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full p-2 border rounded mb-3 focus:outline-indigo-400"
            required
          />
          <textarea
            placeholder="Write your note... (AI will automatically generate tags when you save)"
            value={description}
            onChange={async (e) => {
              const newText = e.target.value;
              setDescription(newText);
              // Optional: Real-time tag preview
              await fetchTags(newText);
            }}
            className="w-full p-2 border rounded mb-3 focus:outline-indigo-400"
            rows="3"
            required
          ></textarea>

          <button
            type="submit"
            className="bg-indigo-500 hover:bg-indigo-600 text-white px-4 py-2 rounded-lg"
          >
            {editingId ? "Update Note" : "Add Note"}
          </button>
          {editingId && (
            <button
              type="button"
              onClick={() => {
                setTitle("");
                setDescription("");
                setEditingId(null);
              }}
              className="ml-3 bg-gray-400 hover:bg-gray-500 text-white px-4 py-2 rounded-lg"
            >
              Cancel
            </button>
          )}
        </form>

        {loading ? (
          <p className="text-gray-500">Loading notes...</p>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {notes.map((note) => (
              <div
                key={note._id}
                className="bg-white shadow-md rounded-lg p-4 border hover:shadow-xl transition"
              >
                <h2 className="text-xl font-semibold text-gray-800">
                  {note.title}
                </h2>
                <p className="text-gray-600 mt-1">{note.description}</p>

                {/* Tags Section for Each Note */}
                <div className="mt-3">
                  <div className="flex flex-wrap gap-2">
                    {/* Star Tag (Highest Priority) */}
                    {note.star_tag && (
                      <span className="bg-gradient-to-r from-yellow-400 to-orange-500 text-white px-3 py-1 rounded-full text-sm font-bold flex items-center">
                        ⭐ {note.star_tag.label}
                        <span className="ml-1 text-xs opacity-90">
                          ({Math.round(note.star_tag.score * 100)}%)
                        </span>
                      </span>
                    )}

                    {/* Top Tag (Second Highlight) */}
                    {note.top_tag && !note.star_tag && (
                      <span className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white px-3 py-1 rounded-full text-sm font-medium flex items-center">
                        🏆 {note.top_tag.label}
                        <span className="ml-1 text-xs opacity-90">
                          ({Math.round(note.top_tag.score * 100)}%)
                        </span>
                      </span>
                    )}

                    {/* Other Tags */}
                    {note.tags && note.tags.map((tag, index) => {
                      // Skip the first tag if it's already displayed as star/top tag
                      if (index === 0 && (note.star_tag || note.top_tag)) {
                        return null;
                      }
                      return (
                        <span
                          key={index}
                          className="bg-indigo-100 text-indigo-700 px-2 py-1 rounded-full text-xs flex items-center"
                        >
                          #{tag.label}
                          <span className="ml-1 text-xs opacity-75">
                            ({Math.round(tag.score * 100)}%)
                          </span>
                        </span>
                      );
                    })}

                    {/* Fallback for notes without tags */}
                    {(!note.tags || note.tags.length === 0) && (
                      <span className="text-gray-400 text-xs">No tags generated</span>
                    )}
                  </div>

                  {/* Tag Statistics */}
                  {note.tags && note.tags.length > 0 && (
                    <div className="mt-2 text-xs text-gray-500">
                      {note.tags.length} AI-generated tags
                      {note.star_tag && (
                        <span> • Star tag: {note.star_tag.label} ({(note.star_tag.priority * 100).toFixed(0)}% priority)</span>
                      )}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="mt-4 flex gap-3">
                  <button
                    onClick={() => handleEdit(note)}
                    className="text-sm bg-yellow-400 hover:bg-yellow-500 text-white px-3 py-1 rounded"
                  >
                    ✏️ Edit
                  </button>
                  <button
                    onClick={() => handleDelete(note._id)}
                    className="text-sm bg-red-500 hover:bg-red-600 text-white px-3 py-1 rounded"
                  >
                    🗑️ Delete
                  </button>
                </div>

                {/* Created/Updated Time */}
                <div className="mt-2 text-xs text-gray-400">
                  {note.updatedAt ?
                    `Updated: ${new Date(note.updatedAt).toLocaleDateString()}` :
                    `Created: ${new Date(note.createdAt).toLocaleDateString()}`
                  }
                </div>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Right: Global Top Tags Sidebar */}
      <div className="w-64 ml-6">
        <div className="bg-white shadow-lg rounded-lg p-4 sticky top-4">
          <h2 className="text-lg font-bold text-gray-700 mb-3">🔥 Global Top Tags</h2>
          <p className="text-xs text-gray-500 mb-3">Across all notes</p>
          <ul className="space-y-2">
            {globalTopTags.map((tag, idx) => (
              <li
                key={idx}
                className="flex justify-between items-center bg-gray-100 px-3 py-2 rounded-lg"
              >
                <span className="text-indigo-600 font-medium">#{tag.label}</span>
                <div className="text-xs text-gray-500 text-right">
                  <div>{(tag.averageScore * 100).toFixed(0)}% avg</div>
                  <div>{tag.noteCount} notes</div>
                </div>
              </li>
            ))}
          </ul>

          {globalTopTags.length === 0 && !loading && (
            <p className="text-gray-500 text-sm text-center py-4">
              No tags yet. Create some notes!
            </p>
          )}
        </div>
      </div>
    </div>
  );
}