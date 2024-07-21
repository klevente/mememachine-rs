import {
  ActionFunctionArgs,
  unstable_createFileUploadHandler as createFileUploadHandler,
  unstable_parseMultipartFormData as parseMultipartFormData,
} from "@remix-run/node";

const FILE_PATH = "./public/sounds";

export async function action(args: ActionFunctionArgs) {
  const uploadHandler = createFileUploadHandler({
    directory: FILE_PATH,
    avoidFileConflicts: false,
    file: ({ filename }) => filename.replace(" ", "_"),
  });
  await parseMultipartFormData(args.request, uploadHandler);
  return null;
}
