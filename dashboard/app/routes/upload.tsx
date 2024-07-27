import {
  ActionFunctionArgs,
  MaxPartSizeExceededError,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from "@remix-run/node";
import { MAX_UPLOAD_SIZE, SOUNDS_PATH } from "~/config/constants.server";

export async function action(
  args: ActionFunctionArgs,
): Promise<{ success: boolean; message?: string }> {
  try {
    const uploadHandler = createFileUploadHandler({
      directory: SOUNDS_PATH,
      avoidFileConflicts: false,
      maxPartSize: MAX_UPLOAD_SIZE,
      file: ({ filename }) => filename.replace(" ", "_"),
    });
    await parseMultipartFormData(args.request, uploadHandler);
    return {
      success: true,
    };
  } catch (e) {
    if (e instanceof MaxPartSizeExceededError) {
      return {
        success: false,
        message: `The sound(s) exceed the maximum upload size of ${e.maxBytes} bytes!`,
      };
    }
    console.error("An unknown error occurred while uploading file", e);
    return {
      success: false,
    };
  }
}
