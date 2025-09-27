import express from 'express';
import { HfInference } from '@huggingface/inference';
import dotenv from 'dotenv';

dotenv.config();

const router = express.Router();

if (!process.env.HF_API_KEY) {
  console.error('HF_API_KEY is missing in environment variables');
}

const hf = new HfInference(process.env.HF_API_KEY);

// POST /tags/generate-tags (for real-time preview)
router.post('/generate-tags', async (req, res) => {
  try {
    const { text } = req.body;
    
    if (!text || text.trim().length === 0) {
      return res.status(400).json({ error: 'Valid text is required' });
    }

    if (text.length > 1000) {
      return res.status(400).json({ error: 'Text too long. Maximum 1000 characters allowed.' });
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
        label: item.label.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase()),
        score: Math.round(item.score * 100) / 100,
        rank: index + 1
      }));

    const star_tag = tags.length > 0 ? {
      label: tags[0].label,
      score: tags[0].score,
      rank: 1,
      is_star: true,
      priority: calculatePriority(0, tags[0].score)
    } : null;

    res.json({
      success: true,
      tags: tags,
      star_tag: star_tag,
      top_tag: tags.length > 0 ? tags[0] : null,
      input_length: text.length
    });

  } catch (error) {
    console.error('Tag Generation Error:', error);
    
    if (error.message.includes('401')) {
      return res.status(401).json({ error: 'Invalid Hugging Face API key' });
    } else if (error.message.includes('timeout') || error.message.includes('network')) {
      return res.status(503).json({ error: 'Service temporarily unavailable. Please try again.' });
    } else {
      return res.status(500).json({ 
        error: 'Failed to generate tags',
        details: process.env.NODE_ENV === 'development' ? error.message : 'Internal server error'
      });
    }
  }
});

// Helper function
function calculatePriority(rank, score) {
  const rankWeight = 0.6;
  const scoreWeight = 0.4;
  const normalizedRank = 1 - (rank / 5);
  const priorityScore = (normalizedRank * rankWeight) + (score * scoreWeight);
  return Math.round(priorityScore * 100) / 100;
}

export default router;