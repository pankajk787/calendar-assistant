import * as z from "zod";

export const getEventSchema = z.object({
    timeMin: z.string().describe("The 'from' date time to get the events."),
    timeMax: z.string().describe("The 'to' date time to get the events."),
    q: z.string().describe("The query to be used to describe get the vents from google calendar. It will be used for free-text search filter. It can be any one of these values: summary, description, location, attendee's display name, attendee's email, organizer's display name, organizer's email.")
})

export const createEventSchema = z.object({ 
    summary: z.string().describe("The title of the event."),
    start: z.object({
        dateTime: z.string().describe("The start date time of the event."),
        timeZone: z.string().describe("Current IANA timezone string.")
    }),
    end: z.object({
        dateTime: z.string().describe("The end date time of the event."),
        timeZone: z.string().describe("Current IANA timezone string.")
    }),
    attendees: z.array(z.object({
        email: z.string().describe("The email Id of the attendee."),
        displayName: z.string().describe("The display name of the attendee.")
    }))
});

export const updateEventSchema = z.object({
  eventId: z.string().describe("The ID of the calendar event being updated."),
  summary: z.string().optional().describe("Updated event title."),
  start: z
    .object({
      dateTime: z.string().describe("Updated start time of the event."),
      timeZone: z.string().describe("Current IANA timezone string."),
    })
    .optional(),
  end: z
    .object({
      dateTime: z.string().describe("Updated start time of the event."),
      timeZone: z.string().describe("Current IANA timezone string."),
    })
    .optional(),
  attendees: z
    .array(
      z.object({
        email: z.string().describe("The email Id of the attendee."),
        displayName: z.string().optional().describe("The display name of the attendee."),
      })
    )
    .optional()
    .describe("Updated attendee list."),
});

export const deleteEventSchema = z.object({
  eventId: z.string().describe("The ID of the calendar event being updated."),
});

export type CreateEventData = z.infer<typeof createEventSchema>;
export type UpdateEventData = z.infer<typeof updateEventSchema>;
export type DeleteEventData = z.infer<typeof deleteEventSchema>;