import { tool } from "@langchain/core/tools";
import * as z from "zod";

export const createEventTool = tool(async () => {
        return JSON.stringify([{
            title: "Meeting with Pankaj",
            date: "11th Nov 2025",
            time: "2",
            location: "Gmeet"
        }])
    },
    {
        name: "create-event",
        description: "call to create the calendar event.",
        schema: z.object({})
    }
)

export const getEventsTool = tool(async () =>{
    return JSON.stringify([{
        title: "Meeting with Pankaj",
        date: "11th Nov 2025",
        time: "2",
        location: "Gmeet"
    }])
}, {
    name: 'get-events',
    description: "Call to get the calendar events.",
})