import data from "../model/notesSchema.js";
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

const hf = new HfInference(process.env.HF_API_KEY);

// Helper function to generate tags from text
async function generateTagsForText(text) {
  try {
    if (!text || text.trim().length === 0) {
      return { tags: [], top_tag: null };
    }

    const classificationResult = await hf.textClassification({
      model: 'cardiffnlp/tweet-topic-21-multi',
      inputs: text,
    });

    const results = Array.isArray(classificationResult) ? classificationResult : [classificationResult];
    
    const tags = results
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((item, index) => ({
        label: formatLabel(item.label),
        score: Math.round(item.score * 100) / 100,
        rank: index + 1
      }));

    return {
      tags: tags,
      top_tag: tags.length > 0 ? tags[0] : null, // Star tag (highest priority)
      star_tag: tags.length > 0 ? { // Additional star tag with more details
        label: tags[0].label,
        score: tags[0].score,
        rank: 1,
        is_star: true,
        priority: calculatePriority(0, tags[0].score)
      } : null
    };
  } catch (error) {
    console.error('Error generating tags:', error);
    return {
      tags: [],
      top_tag: null,
      star_tag: null
    };
  }
}

// Helper functions
function formatLabel(label) {
  return label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

function calculatePriority(rank, score) {
  const rankWeight = 0.6;
  const scoreWeight = 0.4;
  const normalizedRank = 1 - (rank / 5);
  const priorityScore = (normalizedRank * rankWeight) + (score * scoreWeight);
  return Math.round(priorityScore * 100) / 100;
}

// Create notes with auto-generated tags
export const createNotes = async (req, res) => {
  try {
    const body = req.body;
    
    // Generate tags from description
    const tagData = await generateTagsForText(body.description);
    
    const newNotes = new data({
      ...body,
      tags: tagData.tags,
      top_tag: tagData.top_tag,
      star_tag: tagData.star_tag // Save the star tag separately
    });
    
    await newNotes.save();

    res.status(201).json({ 
      message: "Notes created successfully with AI tags", 
      data: newNotes 
    });
  } catch (err) {
    console.error('Error creating notes:', err);
    res.status(500).json({ 
      message: "Error creating notes", 
      error: err.message 
    });
  }
};

// Get all notes
export const getNotes = async (req, res) => {
  try {
    const allNotes = await data.find().sort({ createdAt: -1 });
    res.status(200).json(allNotes);
  } catch (err) {
    console.error('Error fetching notes:', err);
    res.status(500).json({ 
      message: "Error fetching notes", 
      error: err.message 
    });
  }
};

// Delete Notes
export const deleteNotes = async (req, res) => {
  try {
    const id = req.params.id;
    const deletedNote = await data.findByIdAndDelete(id);
    
    if (!deletedNote) {
      return res.status(404).json({ message: "Note not found" });
    }
    
    res.status(200).json({ 
      message: "Note deleted successfully",
      deletedNote: deletedNote 
    });
  } catch (err) {
    console.error('Error deleting note:', err);
    res.status(500).json({ 
      message: "Error deleting note", 
      error: err.message 
    });
  }
};

// Update a note and regenerate tags
export const updateNotes = async (req, res) => {
  try {
    const id = req.params.id;
    const body = req.body;
    
    // Regenerate tags if description is being updated
    let tagData = {};
    if (body.description) {
      tagData = await generateTagsForText(body.description);
    } else {
      // Keep existing tags if description isn't updated
      const existingNote = await data.findById(id);
      tagData = {
        tags: existingNote?.tags || [],
        top_tag: existingNote?.top_tag || null,
        star_tag: existingNote?.star_tag || null
      };
    }
    
    const updatedNotes = await data.findByIdAndUpdate(id, {
      ...body,
      tags: tagData.tags,
      top_tag: tagData.top_tag,
      star_tag: tagData.star_tag
    }, {
      new: true,
      runValidators: true
    });

    if (!updatedNotes) {
      return res.status(404).json({ message: "Note not found" });
    }

    res.status(200).json({ 
      message: "Note updated successfully with new tags", 
      data: updatedNotes 
    });
  } catch (err) {
    console.error('Error updating note:', err);
    res.status(500).json({ 
      message: "Error updating note", 
      error: err.message 
    });
  }
};