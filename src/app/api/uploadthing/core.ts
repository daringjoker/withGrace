import { createUploadthing, type FileRouter } from "uploadthing/next";

const f = createUploadthing();

// File router for baby event images
export const ourFileRouter = {
  babyEventImages: f({ 
    image: { 
      maxFileSize: "4MB", 
      maxFileCount: 5 
    } 
  })
    .middleware(async () => {
      // For now, we'll allow all uploads
      // In the future, you might want to add authentication here
      return { userId: "baby-tracker" };
    })
    .onUploadComplete(async ({ metadata, file }) => {
      console.log("Upload complete for userId:", metadata.userId);
      console.log("File URL:", file.url);
      console.log("File key:", file.key);
      
      // Return metadata that will be available on the client
      return { 
        uploadedBy: metadata.userId,
        url: file.url,
        key: file.key
      };
    }),
} satisfies FileRouter;

export type OurFileRouter = typeof ourFileRouter;