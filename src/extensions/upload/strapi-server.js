const validateUploadBody = require("./validation/upload");
const utils = require('@strapi/utils');
const { sanitize } = utils;

const getService = (name) => {
  return strapi.plugin("upload").service(name);
};

const sanitizeOutput = (data, ctx) => {
  const schema = strapi.getModel('plugin::upload.file');
  const { auth } = ctx.state;

  return sanitize.contentAPI.output(data, schema, { auth });
};

const ACTIONS = {
  read: "plugin::upload.read",
  readSettings: "plugin::upload.settings.read",
  create: "plugin::upload.assets.create",
  update: "plugin::upload.assets.update",
  download: "plugin::upload.assets.download",
  copyLink: "plugin::upload.assets.copy-link",
};

const fileModel = "plugin::upload.file";

module.exports = (coreApi) => {

  console.log(coreApi.controllers["content-api"].uploadFiles, "heh")
  coreApi.controllers["admin-api"].uploadFiles = async (ctx) => {
    const {
      state: { userAbility, user },
      request: { body, files: { files } = {} },
    } = ctx;

    const uploadService = getService("upload");
    const pm = strapi.admin.services.permission.createPermissionsManager({
      ability: userAbility,
      action: ACTIONS.create,
      model: fileModel,
    });

    if (!pm.isAllowed) {
      return ctx.forbidden();
    }

    const data = await validateUploadBody(body);
    const uploadedFiles = await uploadService.upload({ data, files }, { user });

    const response = await pm.sanitizeOutput(uploadedFiles, {
      action: ACTIONS.read,
    });

    Promise.all(
      response.map(async (item) => {
        const imageData = {
          name: item.name,
          ext: item.ext,
          mime: item.mime,
          url: item.url,
          provider: item.provider,
          image: item.id,
          imageID: item.id.toString(),
          uploadedBy: user.id,
        };

        await strapi.service("api::document.document").create({
          data: { ...imageData },
        });
      })
    ).catch((err) => console.log(err, "Failed to create document"));

    ctx.body = response;
  };

  coreApi.controllers["content-api"].uploadFiles = async (ctx) => {
    const {
      request: { body, files: { files } = {} },
    } = ctx;

    const { user } = ctx.state;

    const uploadedFiles = await getService("upload").upload({
      data: await validateUploadBody(body),
      files,
    });


    Promise.all(
      uploadedFiles.map(async (item) => {
        const imageData = {
          name: item.name,
          ext: item.ext,
          mime: item.mime,
          url: item.url,
          provider: item.provider,
          image: item.id,
          imageID: item.id.toString(),
          uploadedBy: user ? user.id : null,
        };

        await strapi.service("api::document.document").create({
          data: { ...imageData },
        });
      })
    ).catch((err) => console.log(err, "Failed to create document"));

    ctx.body = await sanitizeOutput(uploadedFiles, ctx);
  };

  return coreApi;
};
