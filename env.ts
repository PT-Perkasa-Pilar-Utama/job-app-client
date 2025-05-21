import { z } from "zod";

const EnvSchema = z.object({
  TOKEN: z.string().nonempty({ message: "TOKEN cannot be empty" }),
  CLIENT_ID: z.string().nonempty({ message: "CLIENT_ID cannot be empty" }),
  CHANNEL_ID: z.string().nonempty({ message: "CHANNEL_ID cannot be empty" }),
  ANTHROPIC_API_KEY: z.string().nonempty({
    message: "ANTHROPIC_API_KEY acquired from https://console.anthropic.com/",
  }),

  JOB_APP_MCP_URL: z
    .string()
    .url({ message: "JOB_APP_API_URL must be a valid URL" })
    .nonempty({ message: "JOB_APP_API_URL cannot be empty" }),
});

export type Env = z.infer<typeof EnvSchema>;

const result = EnvSchema.safeParse(Bun.env);
if (!result.success) {
  console.error("❌ Invalid environment variables:");
  console.error(JSON.stringify(result.error.format(), null, 2));
  process.exit(1);
}

const env: Env = result.data;
export default env!;
