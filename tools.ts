import { tool } from "@langchain/core/tools";
import * as z from "zod";
import { google } from "googleapis";
import tokens from "./tokens.json";

type Params = {
    timeMin: string;
    timeMax: string;
    q: string;
}

const oauth2Client = new google.auth.OAuth2(
    process.env.GOOGLE_CLIENT_ID,
    process.env.GOOGLE_CLIENT_SECRET,
    process.env.GOOGLE_REDIRECT_URL
);

oauth2Client.setCredentials(tokens);

const calendar = google.calendar({ version: 'v3', auth: oauth2Client });
export const getEventsTool = tool(async (params) =>{
    /**
     * timeMin
     * Timemax
     * q
     */
    const { timeMin, timeMax, q } = params as Params;
    console.log("Called Get Events Tool:", params)
    try{
        const response = await calendar.events.list({
            // calendarId: "pankajadi447@gmail.com"/
            calendarId: "primary",
            q,
            timeMin,
            timeMax
        })
        const result = response.data.items?.map(event => {
            return {
                id: event.id,
                start: event.start,
                end: event.end,
                summary: event.summary,
                status: event.status,
                organizer: event.organizer,
                attendees: event.attendees,
                meetingLink: event.hangoutLink,
                eventType: event.eventType
            }
        });
        return JSON.stringify(result)
    } catch(err) {
        console.log("Error: ", err)
    }
    return "Failed to connect with the calendar."
}, {
    name: 'get-events',
    description: "Call to get the calendar events.",
    schema: z.object({
        timeMin: z.string().describe("The from datetime in UTC format for the event."),
        timeMax: z.string().describe("The to datetime in UTC format for the event."),
        q: z.string().describe("The query to be used to describe get the vents from google calendar. It will be used for free-text search filter. It can be any one of these values: summary, description, location, attendee's display name, attendee's email, organizer's display name, organizer's email.")})
});


export const createEventTool = tool(async ( { query }) => {
        return "Meeting has been created."
    },
    {
        name: "create-event",
        description: "call to create the calendar event.",
        schema: z.object({ query: z.string().describe("The query to be used to create event into Google Calendar.") })
    }
)