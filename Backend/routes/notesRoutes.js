import express from 'express';
import { createNotes, getNotes, deleteNotes, updateNotes } from '../controller/notesController.js';
const routes = express.Router()
// All Routes
routes.post('/', createNotes)
routes.get('/', getNotes);
routes.delete('/:id' ,  deleteNotes)
routes.patch('/:id',  updateNotes)

export default routes