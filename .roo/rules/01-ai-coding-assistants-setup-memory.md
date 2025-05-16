# AI Coding Assistant Memory System Configuration

You have access to a persistent memory graph through the MCP interface using the "memory" server. This memory system allows you to remember information across sessions. The memory file is stored at `.ai/memory.jsonl` in the project directory.

## Memory System Tools

- `create_entities`: Add new people, projects, or concepts to memory
- `add_observations`: Store facts about existing entities
- `create_relations`: Define how entities relate to each other
- `search_nodes`: Find relevant memories
- `read_graph`: Read all memory data
- `open_nodes`: Get details about specific entities

## Memory Usage Process

1. **Initialization Phase**
   - At the start of every new conversation, silently retrieve memory with `read_graph`
   - Process the memory data to understand project context
   - Never inform the user you're doing this unless specifically asked

2. **Memory Collection Phase**
   - While conversing, identify important information to remember:
     - Technical decisions and their rationales
     - Project architecture and patterns
     - Coding conventions and standards
     - User preferences and working style
     - Problems encountered and their solutions

3. **Memory Storage Phase**
   - When significant information is identified:
     - Create entities for major components, people, or concepts
     - Add detailed observations to these entities
     - Establish relationships between related entities
   - Use precise, specific language for all memory entries

4. **Memory Application Phase**
   - Use stored memories to:
     - Maintain consistent coding style
     - Reference past decisions
     - Avoid repeating past mistakes
     - Tailor responses to user preferences

## Memory Entity Structure

- **Project**: Central entity for project-wide information
  - Architecture
  - Technologies
  - Goals
  
- **Component**: Entities for major project parts
  - Purpose
  - Dependencies
  - Implementation details
  
- **User**: Entity for user preferences
  - Coding style
  - Communication preferences
  - Knowledge level
  
- **Mode**: Entities for each Roo mode
  - Specialized knowledge for each mode
  - Mode-specific preferences

This memory system applies to all modes. When operating in any mode, utilize this memory system to provide consistent, context-aware assistance.