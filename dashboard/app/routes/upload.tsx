import {
  ActionFunctionArgs,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from "@remix-run/node";
import { MAX_UPLOAD_SIZE, SOUNDS_PATH } from "~/config/constants.server";

export async function action(args: ActionFunctionArgs) {
  const uploadHandler = createFileUploadHandler({
    directory: SOUNDS_PATH,
    avoidFileConflicts: false,
    maxPartSize: MAX_UPLOAD_SIZE,
    file: ({ filename }) => filename.replace(" ", "_"),
  });
  await parseMultipartFormData(args.request, uploadHandler);
  return null;
}
