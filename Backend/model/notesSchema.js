import mongoose from 'mongoose'

const notesSchema = new mongoose.Schema({
    title: {
        type: String,
        required: true,
        trim: true
    },
    description: {
        type: String,
        required: true,
        trim: true
    },
    tags: [{
        label: String,
        score: Number,
        rank: Number
    }],
    top_tag: {
        label: String,
        score: Number
    },
    star_tag: {  
        label: String,
        score: Number,
        rank: Number,
        is_star: {
            type: Boolean,
            default: true
        },
        priority: Number
    }
}, {
    timestamps: true
});

const data = mongoose.model('notes', notesSchema);
export default data;