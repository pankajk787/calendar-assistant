import { ChatGroq } from "@langchain/groq";
import { createEventTool, deleteEventTool, getEventsTool, updateEventTool, webSearchTool } from "./tools";
import { END, MemorySaver, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { AIMessage } from "@langchain/core/messages";
import readline from "readline/promises";

const rl = readline.createInterface({ input: process.stdin, output: process.stdout });

const tools: any = [ createEventTool, getEventsTool, updateEventTool, deleteEventTool, webSearchTool ];

const model = new ChatGroq({
    model: "openai/gpt-oss-120b",
    temperature: 0
}).bindTools(tools);


/**
 * Assisstant node
 */
async function callModel(state: typeof MessagesAnnotation.State) {
    const response = await model.invoke(state.messages);
    return { messages: [response] };
}

/**
 * Tool node
 */
const toolNode = new ToolNode(tools);

/**
 * Build the graph
 */

function shouldContinueTo (state: typeof MessagesAnnotation.State) {
    const lastMessage = state.messages[state.messages.length - 1] as AIMessage;
    if(lastMessage.tool_calls?.length) {
        return "tool_calls";
    }
    return "__end__";
}

const graph = new StateGraph(MessagesAnnotation)
    .addNode("assistant", callModel)
    .addNode("tool_calls", toolNode)
    .addEdge("__start__", 'assistant')
    .addEdge("tool_calls", "assistant")
    .addConditionalEdges("assistant", shouldContinueTo, {
        "__end__" : END,
        tool_calls : "tool_calls"
    }
);

// memory for the LLM
const checkpointer = new MemorySaver();

const app = graph.compile({ checkpointer });

async function main() {
    const config = { configurable: { thread_id: '1' } };
    
    console.log("Assistant: Hi, I am your assistant. I can help you schedule events and check what’s on your calendar. How can I help you today?");
    while(true) {
        const currentDateTime = new Date().toLocaleString("sv-SE").replace(" ", "T");
        const localtimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
        const userInput = await rl.question("You: ");
        const lcUserInput = userInput.toLowerCase();
        if(lcUserInput === "bye" || lcUserInput === "quit" || lcUserInput === "exit") {
            console.log("Assistant: Catch you later! If anything pops up, I’ve got you.");
            break;
        }
        const result = await app.invoke({
            messages: [
                { 
                    role: "system", 
                    // content: `You are a smart personal assisstant. You can help schedule events and check what’s on the calendar. You can also update and delete events in the calendar.
                    //     Also you can do web search to search the information if don't have in case it is not about the personal calendar but something else.
                    //     You have access to the provided tools. 
                    //     Current date time ${currentDateTime}.
                    //     Current timezone string ${localtimeZone}`
                    content: `You are a highly capable personal assistant. Your main responsibilities are:
                    - Creating, updating, and deleting events in the user's calendar.
                    - Reading the user's upcoming events and helping them plan their schedule.
                    - Performing web searches only when the user asks for information that is not related to their personal calendar.

                    Use the available tools whenever they can help you complete a request.  
                    For calendar-related tasks, always prefer the calendar tools.  
                    For general factual questions or external information, use the web search tool.

                    The current date and time is: ${currentDateTime}  
                    The user’s timezone is: ${localtimeZone}

                    Always give clear, direct answers. If a tool is required to complete a task, call it.
                    `
                },
                { role: "human", content: userInput },
            ]
        }, config);

        const finalMessage = result.messages[result.messages.length - 1];
        console.log("Assistant: ", finalMessage?.content);
    }

    rl.close();
}
main();