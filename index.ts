import { ChatGroq } from "@langchain/groq";
import { createEventTool, getEventsTool } from "./tools";
import { END, MessagesAnnotation, StateGraph } from "@langchain/langgraph";
import { ToolNode } from "@langchain/langgraph/prebuilt";
import type { AIMessage } from "@langchain/core/messages";

const tools: any = [createEventTool, getEventsTool];

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

const app = graph.compile();

async function main() {
    const config = { configurable: { thread_id: '1' } };
    const result = await app.invoke({
        messages: [
            { role: "human", content: "Do I have any meetings scheduled with Pankaj?"},
            { role: "system", content: `You are a personal assisstant. Current date and time ${new Date().toUTCString()}.` }
        ]
    }, config);

    const finalMessage = result.messages[result.messages.length - 1];
    console.log("AI: ", finalMessage?.content);
}
main();