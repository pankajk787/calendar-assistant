import { tool } from "@langchain/core/tools";
import * as z from "zod";

export const createEventTool = tool(async ( { query }) => {
        return "Meeting has been created."
    },
    {
        name: "create-event",
        description: "call to create the calendar event.",
        schema: z.object({ query: z.string().describe("The query to be used to create event into Google Calendar.") })
    }
)

export const getEventsTool = tool(async ({ query }) =>{
    return JSON.stringify([{
        title: "Meeting with Pankaj",
        date: "15th Nov 2025",
        time: "2",
        location: "Gmeet"
    }])
}, {
    name: 'get-events',
    description: "Call to get the calendar events.",
    schema: z.object({ query: z.string().describe("The query to be used to describe get the vents from google calendar.")})
})