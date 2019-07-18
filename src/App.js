import React, { useState, useEffect } from "react";
import { API, graphqlOperation } from "aws-amplify";
import { withAuthenticator } from "aws-amplify-react";
import { createNote, deleteNote, updateNote } from "./graphql/mutations";
import { listNotes } from "./graphql/queries";
import {
  onCreateNote,
  onDeleteNote,
  onUpdateNote
} from "./graphql/subscriptions";

function App() {
  const [noteData, setNoteData] = useState([]);

  const [formData, setFormData] = useState({
    note: ""
  });

  useEffect(() => {
    fetchNotes();
  }, []);

  // subscribe create
  useEffect(() => {
    const subscription = API.graphql(graphqlOperation(onCreateNote)).subscribe({
      next: subNoteData => {
        const newNote = subNoteData.value.data.onCreateNote;
        const prevNotes = noteData.filter(n => n.id !== newNote.id);
        const updatedNotes = [...prevNotes, newNote];
        setNoteData(updatedNotes);
      }
    });
    return () => subscription.unsubscribe();
  }, [noteData]);

  // subscribe delete
  useEffect(() => {
    const subscription = API.graphql(graphqlOperation(onDeleteNote)).subscribe({
      next: subNoteData => {
        const deletedNote = subNoteData.value.data.onDeleteNote;
        const updatedNotes = noteData.filter(n => n.id !== deletedNote.id);
        setNoteData(updatedNotes);
      }
    });
    return () => subscription.unsubscribe();
  }, [noteData]);

  const fetchNotes = async () => {
    const res = await API.graphql(graphqlOperation(listNotes));
    setNoteData(res.data.listNotes.items);
  };

  const deleteItem = async noteId => {
    const input = { id: noteId };
    const oldNoteData = noteData;
    const updatedNotes = noteData.filter(item => item.id !== noteId);
    setNoteData(updatedNotes);
    try {
      await API.graphql(graphqlOperation(deleteNote, { input }));
    } catch (error) {
      console.log(error);
      setNoteData(oldNoteData);
    }
  };

  const getNote = note => {
    setFormData(note);
  };

  const handleUpdateNote = async () => {
    const res = await API.graphql(
      graphqlOperation(updateNote, { input: formData })
    );
    const updatedNote = res.data.updateNote;
    const index = noteData.findIndex(note => note.id === updatedNote.id);
    const updatedNotes = [
      ...noteData.slice(0, index),
      updatedNote,
      ...noteData.slice(index + 1)
    ];
    setNoteData(updatedNotes);
  };

  const hasExistingNote = () => {
    if (formData.id) {
      const isNote = noteData.findIndex(note => note.id === formData.id) > -1;
      return isNote;
    }
    return false;
  };

  const onChange = e => {
    setFormData({ ...formData, [e.target.name]: e.target.value });
  };

  const onSubmit = async e => {
    e.preventDefault();
    // Check if existing note, if so update
    if (hasExistingNote()) {
      handleUpdateNote();
      console.log("note updated");
    } else {
      // Removed due subscribe
      // setNoteData([...noteData, formData]);
      await API.graphql(graphqlOperation(createNote, { input: formData }));
      setFormData({ note: "" });
      // Removed due subscribe
      // setNoteData([...noteData, result.data.createNote]);
    }
  };

  return (
    <div className="flex flex-column items-center justify-center pa3 bg-washed-red">
      <h1 className="code f2-l">Amplify Notetaker</h1>
      <form className="mb3" onSubmit={e => onSubmit(e)}>
        <input
          type="text"
          className="pa2 f4"
          placeholder="Write your note"
          value={formData.note}
          name="note"
          onChange={e => onChange(e)}
        />
        <button className="pa2 f4" type="submit">
          {formData.id ? "Update note" : "Add Note"}
        </button>
      </form>
      {/* Note list */}
      <div>
        {noteData.map(item => (
          <div key={item.id} className="flex items-center">
            <li className="list pa1 f3" onClick={() => getNote(item)}>
              {item.note}
            </li>
            <button
              onClick={() => deleteItem(item.id)}
              className="bg-transparent bn f4"
            >
              <span>&times;</span>
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}

export default withAuthenticator(App, { includeGreetings: true });
