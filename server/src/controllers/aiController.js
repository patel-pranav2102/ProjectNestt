import AiConversation from '../models/AiConversation.js';
import Project from '../models/Project.js';
import Board from '../models/Board.js';
import Card from '../models/Card.js';
import Document from '../models/Document.js';
import { generateLLMResponse, generateCodeCompletion } from '../services/aiService.js';
import { 
  BadRequestError, 
  NotFoundError, 
  ForbiddenError 
} from '../utils/errors.js';

// 1. GENERATE CHAT RESPONSE (With contextual project awareness)
export const generateChatResponse = async (req, res, next) => {
  try {
    const { conversationId, projectId, messages, selectedModel } = req.body;

    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      throw new BadRequestError('Messages array is required and cannot be empty.');
    }
    const targetModel = selectedModel || 'Gemini Pro';

    // Build project context dynamically if projectId is linked
    let projectContext = '';
    if (projectId) {
      const project = await Project.findById(projectId);
      if (project) {
        projectContext += `Active project: "${project.name}" (Description: ${project.description || 'None'}).`;
        
        // Append cards titles
        const boards = await Board.find({ projectId });
        if (boards.length > 0) {
          const cards = await Card.find({ boardId: { $in: boards.map(b => b._id) } }).limit(5);
          if (cards.length > 0) {
            projectContext += ` Active Kanban tasks: [${cards.map(c => c.name).join(', ')}].`;
          }
        }

        // Append documents titles
        const docs = await Document.find({ projectId }).limit(5);
        if (docs.length > 0) {
          projectContext += ` Project document notes: [${docs.map(d => d.title).join(', ')}].`;
        }
      }
    }

    // Call service to compile response
    const assistantText = await generateLLMResponse(messages, targetModel, projectContext);

    // Save to Mongoose database
    let conversation;
    
    if (conversationId) {
      conversation = await AiConversation.findById(conversationId);
      if (!conversation) {
        throw new NotFoundError('Conversation session not found.');
      }
      
      // Append user prompt and assistant response
      const userMsg = messages[messages.length - 1];
      conversation.messages.push({
        role: 'user',
        content: userMsg.content,
        model: targetModel,
      });
      conversation.messages.push({
        role: 'assistant',
        content: assistantText,
        model: targetModel,
      });

      await conversation.save();
    } else {
      // Initialize a new conversation history
      const userMsg = messages[messages.length - 1];
      const conversationTitle = userMsg.content.substring(0, 40) + (userMsg.content.length > 40 ? '...' : '');

      conversation = new AiConversation({
        userId: req.user.id,
        projectId: projectId || null,
        title: conversationTitle,
        messages: [
          {
            role: 'user',
            content: userMsg.content,
            model: targetModel,
          },
          {
            role: 'assistant',
            content: assistantText,
            model: targetModel,
          }
        ]
      });

      await conversation.save();
    }

    res.status(200).json({
      status: 'success',
      conversation,
      response: assistantText,
    });
  } catch (error) {
    next(error);
  }
};

// 2. SUGGEST CODE COMPLETION (Monaco inline completion)
export const suggestCodeCompletion = async (req, res, next) => {
  try {
    const { prefixCode, suffixCode } = req.body;

    if (prefixCode === undefined) {
      throw new BadRequestError('prefixCode string is required.');
    }

    const completion = await generateCodeCompletion(prefixCode, suffixCode || '');

    res.status(200).json({
      status: 'success',
      completion,
    });
  } catch (error) {
    next(error);
  }
};

// 3. GET AI HISTORY LIST
export const getHistory = async (req, res, next) => {
  try {
    const conversations = await AiConversation.find({ userId: req.user.id })
      .select('title projectId createdAt updatedAt')
      .sort({ updatedAt: -1 });

    res.status(200).json({
      status: 'success',
      conversations,
    });
  } catch (error) {
    next(error);
  }
};

// 4. GET HISTORY DETAILS LOGS
export const getHistoryDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversation = await AiConversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation log not found.');
    }

    if (conversation.userId.toString() !== req.user.id) {
      throw new ForbiddenError('You do not have permission to view this conversation.');
    }

    res.status(200).json({
      status: 'success',
      conversation,
    });
  } catch (error) {
    next(error);
  }
};

// 5. DELETE CONVERSATION LOG
export const deleteHistory = async (req, res, next) => {
  try {
    const { id } = req.params;

    const conversation = await AiConversation.findById(id);
    if (!conversation) {
      throw new NotFoundError('Conversation log not found.');
    }

    if (conversation.userId.toString() !== req.user.id) {
      throw new ForbiddenError('You do not have permission to delete this conversation.');
    }

    await AiConversation.findByIdAndDelete(id);

    res.status(200).json({
      status: 'success',
      message: 'AI conversation history deleted successfully.',
    });
  } catch (error) {
    next(error);
  }
};
