import multer from "multer";

export const upload = multer({
    limits: {
        fileSize: 5 * 1024 * 1024,
    },
})

export const singleUpload = upload.single("avatar")
export const attachmentsMulter = upload.array("files",5)