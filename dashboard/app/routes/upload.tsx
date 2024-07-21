import {
  ActionFunctionArgs,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from "@remix-run/node";
import { SOUNDS_PATH } from "~/config/config.server";

export async function action(args: ActionFunctionArgs) {
  const uploadHandler = createFileUploadHandler({
    directory: SOUNDS_PATH,
    avoidFileConflicts: false,
    file: ({ filename }) => filename.replace(" ", "_"),
  });
  await parseMultipartFormData(args.request, uploadHandler);
  return null;
}
