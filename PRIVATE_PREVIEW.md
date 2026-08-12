# Private Cloud Run preview

The Vertex AI backend is intentionally private. It does not accept anonymous
requests, so the browser app must use an authenticated local Cloud Run proxy.

1. Sign in with a Google account that has the Cloud Run Invoker role:

   ```bash
   gcloud auth login
   ```

2. Start the proxy from the project directory (Windows):

   ```bash
   npm run ai:proxy
   ```

   On macOS/Linux, run the `gcloud run services proxy` command directly.

3. Keep this in `.env.local`:

   ```env
   EXPO_PUBLIC_GO_GOAL_AI_URL=http://127.0.0.1:8787/go-go-goal
   ```

4. In another terminal, run `npm run web`.

To add another tester later, grant that Google account the Cloud Run Invoker
role on `gogo-goal-ai`. Do not put a Gemini or Google Cloud credential in the
repository or in an `EXPO_PUBLIC_` variable.
