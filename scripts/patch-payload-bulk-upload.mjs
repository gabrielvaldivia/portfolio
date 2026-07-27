import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const dirname = path.dirname(fileURLToPath(import.meta.url))
const root = path.resolve(dirname, '..')

const patches = [
  {
    file: 'node_modules/@payloadcms/ui/dist/forms/Form/index.js',
    find: `    const dataToSerialize = {
      _payload: JSON.stringify(data_5)
    };
    if (docConfig && 'upload' in docConfig && docConfig.upload && file) {
      dataToSerialize.file = file;
    }
    // nullAsUndefineds is important to allow uploads and relationship fields to clear themselves
    const formData_0 = serialize(dataToSerialize, {
      indices: true,
      nullsAsUndefineds: false
    });
    return formData_0;`,
    replace: `    const formData_0 = new FormData();
    formData_0.append('_payload', JSON.stringify(data_5));
    if (docConfig && 'upload' in docConfig && docConfig.upload && file) {
      formData_0.append('file', file);
    }
    return formData_0;`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/elements/BulkUpload/FormsManager/createFormData.js',
    find: `  if (file && typeof uploadHandler === 'function') {
    let filename = file.name;
    const clientUploadContext = await uploadHandler({
      docPrefix: typeof data?.prefix === 'string' ? data.prefix : undefined,
      file,
      updateFilename: value => {
        filename = value;
      }
    });
    file = JSON.stringify({
      clientUploadContext,
      collectionSlug,
      filename,
      mimeType: file.type,
      size: file.size
    });
  }`,
    replace: `  if (file && typeof uploadHandler === 'function' && !file.type?.startsWith('image/')) {
    let filename = file.name;
    const clientUploadContext = await uploadHandler({
      docPrefix: typeof data?.prefix === 'string' ? data.prefix : undefined,
      file,
      updateFilename: value => {
        filename = value;
      }
    });
    file = JSON.stringify({
      clientUploadContext,
      collectionSlug,
      filename,
      mimeType: file.type,
      size: file.size
    });
  }`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/elements/BulkUpload/FormsManager/createFormData.js',
    find: `  const dataToSerialize = {
    _payload: JSON.stringify(dataWithOverrides),
    file
  };
  return serialize(dataToSerialize, {
    indices: true,
    nullsAsUndefineds: false
  });`,
    replace: `  const formData = new FormData();
  formData.append('_payload', JSON.stringify(dataWithOverrides));
  if (file) {
    formData.append('file', file);
  }
  return formData;`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'let It={_payload:JSON.stringify(ct)};return r&&"upload"in r&&r.upload&&At&&(It.file=At),(0,UD.serialize)(It,{indices:!0,nullsAsUndefineds:!1})',
    replace: 'let It=new FormData;return It.append("_payload",JSON.stringify(ct)),r&&"upload"in r&&r.upload&&At&&It.append("file",At),It',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'if(s&&delete n.file,s&&typeof r=="function"){let a=s.name,c=await r({docPrefix:typeof n?.prefix=="string"?n.prefix:void 0,file:s,updateFilename:u=>{a=u}});s=JSON.stringify({clientUploadContext:c,collectionSlug:o,filename:a,mimeType:s.type,size:s.size})}',
    replace: 'if(s&&delete n.file,s&&typeof r=="function"&&!(typeof s.type=="string"&&s.type.startsWith("image/"))){let a=s.name,c=await r({docPrefix:typeof n?.prefix=="string"?n.prefix:void 0,file:s,updateFilename:u=>{a=u}});s=JSON.stringify({clientUploadContext:c,collectionSlug:o,filename:a,mimeType:s.type,size:s.size})}',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'let i={...n,...e},l={_payload:JSON.stringify(i),file:s};return(0,iR.serialize)(l,{indices:!0,nullsAsUndefineds:!1})',
    replace: 'let i={...n,...e},l=new FormData;return l.append("_payload",JSON.stringify(i)),s&&l.append("file",s),l',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `import React, { useCallback, useEffect, useMemo } from 'react';
import { useBulkUpload } from '../../elements/BulkUpload/index.js';`,
    replace: `import React, { useCallback, useEffect, useMemo } from 'react';
import { toast } from 'sonner';
import { useBulkUpload } from '../../elements/BulkUpload/index.js';`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `import { useTranslation } from '../../providers/Translation/index.js';
import { normalizeRelationshipValue } from '../../utilities/normalizeRelationshipValue.js';`,
    replace: `import { useTranslation } from '../../providers/Translation/index.js';
import { useUploadHandlers } from '../../providers/UploadHandlers/index.js';
import { normalizeRelationshipValue } from '../../utilities/normalizeRelationshipValue.js';`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    findStart: `  const [populatedDocs, setPopulatedDocs] = React.useState();
`,
    findEnd: `  const {
    openModal
  } = useModal();`,
    replace: `  const [populatedDocs, setPopulatedDocs] = React.useState();
  const [isInlineUploading, setIsInlineUploading] = React.useState(false);
  const [inlineUploadProgress, setInlineUploadProgress] = React.useState(0);
  const [activeRelationTo] = React.useState(Array.isArray(relationTo) ? relationTo[0] : relationTo);
  const {
    openModal
  } = useModal();`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `  const {
    drawerSlug,
    setCollectionSlug,
    setInitialFiles,
    setMaxFiles,
    setOnSuccess,
    setSelectableCollections
  } = useBulkUpload();
  const {
    permissions
  } = useAuth();`,
    replace: `  const {
    drawerSlug,
    setCollectionSlug,
    setInitialFiles,
    setMaxFiles,
    setOnSuccess,
    setSelectableCollections
  } = useBulkUpload();
  const {
    getUploadHandler
  } = useUploadHandlers();
  const {
    permissions
  } = useAuth();`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    optional: true,
    always: true,
    findStart: `  const createInlineUploadFormData = React.useCallback(async (file, collectionToUse) => {
    let fileToUpload = file;
    const uploadHandler = getUploadHandler({
      collectionSlug: collectionToUse
    });
    if (fileToUpload && typeof uploadHandler === 'function' && !fileToUpload.type?.startsWith('image/')) {
`,
    findEnd: `  // only hasMany can bulk select`,
    replace: `  const createInlineUploadFormData = React.useCallback(async (file, collectionToUse) => {
    let fileToUpload = file;
    const uploadHandler = getUploadHandler({
      collectionSlug: collectionToUse
    });
    if (fileToUpload && typeof uploadHandler === 'function') {
      let filename = fileToUpload.name;
      const clientUploadContext = await uploadHandler({
        docPrefix: undefined,
        file: fileToUpload,
        updateFilename: newFilename => {
          filename = newFilename;
        }
      });
      fileToUpload = JSON.stringify({
        clientUploadContext,
        collectionSlug: collectionToUse,
        filename,
        mimeType: file.type,
        size: file.size
      });
    }
    const formData = new FormData();
    formData.append('_payload', JSON.stringify({}));
    if (fileToUpload) {
      formData.append('file', fileToUpload);
    }
    return formData;
  }, [getUploadHandler]);
  const submitInlineUpload = React.useCallback((actionURL, formData, progressStart, progressEnd) => new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', actionURL);
    request.withCredentials = true;
    request.setRequestHeader('Accept-Language', i18n.language);
    request.upload.onprogress = event => {
      if (event.lengthComputable) {
        setInlineUploadProgress(Math.round(progressStart + event.loaded / event.total * (progressEnd - progressStart)));
      }
    };
    request.onload = () => {
      let json = null;
      try {
        json = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        // Ignore invalid JSON and surface the status failure below.
      }
      resolve({
        json,
        status: request.status
      });
    };
    request.onerror = () => reject(new Error('Upload failed'));
    request.onabort = () => reject(new Error('Upload canceled'));
    request.send(formData);
  }), [i18n.language]);
  const uploadFilesInline = React.useCallback(async fileList => {
    let fileListToUse = fileList;
    if (!hasMany && fileList && fileList.length > 1) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(fileList[0]);
      fileListToUse = dataTransfer.files;
    }
    const collectionToUse = Array.isArray(relationTo) ? activeRelationTo : relationTo;
    let filesToUpload = Array.from(fileListToUse || []);
    if (typeof maxRows === 'number' && hasMany && Array.isArray(value)) {
      filesToUpload = filesToUpload.slice(0, Math.max(maxRows - value.length, 0));
    }
    if (!collectionToUse || filesToUpload.length === 0) {
      return;
    }
    setIsInlineUploading(true);
    setInlineUploadProgress(0);
    const uploadedForms = [];
    try {
      for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex += 1) {
        const file = filesToUpload[fileIndex];
        const progressStart = Math.round(fileIndex / filesToUpload.length * 100);
        const progressEnd = Math.round((fileIndex + 1) / filesToUpload.length * 100);
        setInlineUploadProgress(Math.max(5, progressStart));
        try {
          const actionURL = formatAdminURL({
            apiRoute: api,
            path: '/' + collectionToUse
          }) + qs.stringify({
            locale: code
          }, {
            addQueryPrefix: true
          });
          const {
            json,
            status
          } = await submitInlineUpload(actionURL, await createInlineUploadFormData(file, collectionToUse), progressStart, progressEnd);
          if (status === 201 && json?.doc) {
            uploadedForms.push({
              collectionSlug: collectionToUse,
              doc: json.doc
            });
            setInlineUploadProgress(progressEnd);
          } else {
            toast.error(json?.errors?.[0]?.message || json?.message || 'Upload failed');
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Upload failed');
        }
      }
      if (uploadedForms.length) {
        onUploadSuccess(uploadedForms);
      }
    } finally {
      setIsInlineUploading(false);
      setInlineUploadProgress(0);
    }
  }, [activeRelationTo, api, code, createInlineUploadFormData, hasMany, maxRows, onUploadSuccess, relationTo, submitInlineUpload, value]);
  const onLocalFileSelection = React.useCallback(fileList => {
    if (fileList?.length) {
      void uploadFilesInline(fileList);
      return;
    }
    // Keep the drawer fallback for manual create actions that do not provide files.
    const collectionToUse = Array.isArray(relationTo) ? activeRelationTo : relationTo;
    setCollectionSlug(collectionToUse);
    if (Array.isArray(collectionSlugsWithCreatePermission)) {
      setSelectableCollections(collectionSlugsWithCreatePermission);
    }
    if (typeof maxRows === 'number') {
      setMaxFiles(maxRows);
    }
    openModal(drawerSlug);
  }, [relationTo, activeRelationTo, setCollectionSlug, collectionSlugsWithCreatePermission, maxRows, openModal, drawerSlug, setSelectableCollections, setMaxFiles, uploadFilesInline]);
  // only hasMany can bulk select`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    findStart: `  const onLocalFileSelection = React.useCallback(fileList => {
`,
    findEnd: `  // only hasMany can bulk select`,
    replace: `  const createInlineUploadFormData = React.useCallback(async (file, collectionToUse) => {
    let fileToUpload = file;
    const uploadHandler = getUploadHandler({
      collectionSlug: collectionToUse
    });
    if (fileToUpload && typeof uploadHandler === 'function') {
      let filename = fileToUpload.name;
      const clientUploadContext = await uploadHandler({
        docPrefix: undefined,
        file: fileToUpload,
        updateFilename: newFilename => {
          filename = newFilename;
        }
      });
      fileToUpload = JSON.stringify({
        clientUploadContext,
        collectionSlug: collectionToUse,
        filename,
        mimeType: file.type,
        size: file.size
      });
    }
    const formData = new FormData();
    formData.append('_payload', JSON.stringify({}));
    if (fileToUpload) {
      formData.append('file', fileToUpload);
    }
    return formData;
  }, [getUploadHandler]);
  const submitInlineUpload = React.useCallback((actionURL, formData, progressStart, progressEnd) => new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', actionURL);
    request.withCredentials = true;
    request.setRequestHeader('Accept-Language', i18n.language);
    request.upload.onprogress = event => {
      if (event.lengthComputable) {
        setInlineUploadProgress(Math.round(progressStart + event.loaded / event.total * (progressEnd - progressStart)));
      }
    };
    request.onload = () => {
      let json = null;
      try {
        json = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        // Ignore invalid JSON and surface the status failure below.
      }
      resolve({
        json,
        status: request.status
      });
    };
    request.onerror = () => reject(new Error('Upload failed'));
    request.onabort = () => reject(new Error('Upload canceled'));
    request.send(formData);
  }), [i18n.language]);
  const uploadFilesInline = React.useCallback(async fileList => {
    let fileListToUse = fileList;
    if (!hasMany && fileList && fileList.length > 1) {
      const dataTransfer = new DataTransfer();
      dataTransfer.items.add(fileList[0]);
      fileListToUse = dataTransfer.files;
    }
    const collectionToUse = Array.isArray(relationTo) ? activeRelationTo : relationTo;
    let filesToUpload = Array.from(fileListToUse || []);
    if (typeof maxRows === 'number' && hasMany && Array.isArray(value)) {
      filesToUpload = filesToUpload.slice(0, Math.max(maxRows - value.length, 0));
    }
    if (!collectionToUse || filesToUpload.length === 0) {
      return;
    }
    setIsInlineUploading(true);
    setInlineUploadProgress(0);
    const uploadedForms = [];
    try {
      for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex += 1) {
        const file = filesToUpload[fileIndex];
        const progressStart = Math.round(fileIndex / filesToUpload.length * 100);
        const progressEnd = Math.round((fileIndex + 1) / filesToUpload.length * 100);
        setInlineUploadProgress(Math.max(5, progressStart));
        try {
          const actionURL = formatAdminURL({
            apiRoute: api,
            path: '/' + collectionToUse
          }) + qs.stringify({
            locale: code
          }, {
            addQueryPrefix: true
          });
          const {
            json,
            status
          } = await submitInlineUpload(actionURL, await createInlineUploadFormData(file, collectionToUse), progressStart, progressEnd);
          if (status === 201 && json?.doc) {
            uploadedForms.push({
              collectionSlug: collectionToUse,
              doc: json.doc
            });
            setInlineUploadProgress(progressEnd);
          } else {
            toast.error(json?.errors?.[0]?.message || json?.message || 'Upload failed');
          }
        } catch (error) {
          toast.error(error instanceof Error ? error.message : 'Upload failed');
        }
      }
      if (uploadedForms.length) {
        onUploadSuccess(uploadedForms);
      }
    } finally {
      setIsInlineUploading(false);
      setInlineUploadProgress(0);
    }
  }, [activeRelationTo, api, code, createInlineUploadFormData, hasMany, maxRows, onUploadSuccess, relationTo, submitInlineUpload, value]);
  const onLocalFileSelection = React.useCallback(fileList => {
    if (fileList?.length) {
      void uploadFilesInline(fileList);
      return;
    }
    // Keep the drawer fallback for manual create actions that do not provide files.
    const collectionToUse = Array.isArray(relationTo) ? activeRelationTo : relationTo;
    setCollectionSlug(collectionToUse);
    if (Array.isArray(collectionSlugsWithCreatePermission)) {
      setSelectableCollections(collectionSlugsWithCreatePermission);
    }
    if (typeof maxRows === 'number') {
      setMaxFiles(maxRows);
    }
    openModal(drawerSlug);
  }, [relationTo, activeRelationTo, setCollectionSlug, collectionSlugsWithCreatePermission, maxRows, openModal, drawerSlug, setSelectableCollections, setMaxFiles, uploadFilesInline]);
  // only hasMany can bulk select`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `        disabled: readOnly || !canCreate,
        multipleFiles: hasMany,`,
    replace: `        disabled: readOnly || !canCreate || isInlineUploading,
        multipleFiles: hasMany,`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `                disabled: readOnly || !canCreate,
                onClick: () => {`,
    replace: `                disabled: readOnly || !canCreate || isInlineUploading,
                onClick: () => {`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `              disabled: readOnly,
              onClick: openListDrawer,`,
    replace: `              disabled: readOnly || isInlineUploading,
              onClick: openListDrawer,`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `  const [isInlineUploading, setIsInlineUploading] = React.useState(false);
  const [activeRelationTo] = React.useState(Array.isArray(relationTo) ? relationTo[0] : relationTo);`,
    replace: `  const [isInlineUploading, setIsInlineUploading] = React.useState(false);
  const [inlineUploadProgress, setInlineUploadProgress] = React.useState(0);
  const [activeRelationTo] = React.useState(Array.isArray(relationTo) ? relationTo[0] : relationTo);`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `  const uploadFilesInline = React.useCallback(async fileList => {`,
    replace: `  const submitInlineUpload = React.useCallback((actionURL, formData, progressStart, progressEnd) => new Promise((resolve, reject) => {
    const request = new XMLHttpRequest();
    request.open('POST', actionURL);
    request.withCredentials = true;
    request.setRequestHeader('Accept-Language', i18n.language);
    request.upload.onprogress = event => {
      if (event.lengthComputable) {
        setInlineUploadProgress(Math.round(progressStart + event.loaded / event.total * (progressEnd - progressStart)));
      }
    };
    request.onload = () => {
      let json = null;
      try {
        json = request.responseText ? JSON.parse(request.responseText) : null;
      } catch {
        // Ignore invalid JSON and surface the status failure below.
      }
      resolve({
        json,
        status: request.status
      });
    };
    request.onerror = () => reject(new Error('Upload failed'));
    request.onabort = () => reject(new Error('Upload canceled'));
    request.send(formData);
  }), [i18n.language]);
  const uploadFilesInline = React.useCallback(async fileList => {`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `    setIsInlineUploading(true);
    const uploadedForms = [];`,
    replace: `    setIsInlineUploading(true);
    setInlineUploadProgress(0);
    const uploadedForms = [];`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `      for (const file of filesToUpload) {
        try {`,
    replace: `      for (let fileIndex = 0; fileIndex < filesToUpload.length; fileIndex += 1) {
        const file = filesToUpload[fileIndex];
        const progressStart = Math.round(fileIndex / filesToUpload.length * 100);
        const progressEnd = Math.round((fileIndex + 1) / filesToUpload.length * 100);
        setInlineUploadProgress(Math.max(5, progressStart));
        try {`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `          const response = await fetch(actionURL, {
            body: await createInlineUploadFormData(file, collectionToUse),
            credentials: 'include',
            headers: {
              'Accept-Language': i18n.language
            },
            method: 'POST'
          });
          const json = await response.json().catch(() => null);
          if (response.status === 201 && json?.doc) {`,
    replace: `          const {
            json,
            status
          } = await submitInlineUpload(actionURL, await createInlineUploadFormData(file, collectionToUse), progressStart, progressEnd);
          if (status === 201 && json?.doc) {`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `              collectionSlug: collectionToUse,
              doc: json.doc
            });
          } else {`,
    replace: `              collectionSlug: collectionToUse,
              doc: json.doc
            });
            setInlineUploadProgress(progressEnd);
          } else {`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `    } finally {
      setIsInlineUploading(false);
    }
  }, [activeRelationTo, api, code, createInlineUploadFormData, hasMany, i18n.language, maxRows, onUploadSuccess, relationTo, value]);`,
    replace: `    } finally {
      setIsInlineUploading(false);
      setInlineUploadProgress(0);
    }
  }, [activeRelationTo, api, code, createInlineUploadFormData, hasMany, maxRows, onUploadSuccess, relationTo, submitInlineUpload, value]);`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/Input.js',
    find: `        children: /*#__PURE__*/_jsxs("div", {
          className: \`\${baseClass}__dropzoneContent\`,`,
    replace: `        children: isInlineUploading ? /*#__PURE__*/_jsxs("div", {
          className: \`\${baseClass}__inlineUpload\`,
          children: [/*#__PURE__*/_jsx("div", {
            className: \`\${baseClass}__inlineUploadText\`,
            children: "Uploading..."
          }), /*#__PURE__*/_jsx("div", {
            "aria-label": "Upload progress",
            "aria-valuemax": 100,
            "aria-valuemin": 0,
            "aria-valuenow": inlineUploadProgress,
            className: \`\${baseClass}__inlineUploadTrack\`,
            role: "progressbar",
            children: /*#__PURE__*/_jsx("div", {
              className: \`\${baseClass}__inlineUploadBar\`,
              style: {
                width: \`\${inlineUploadProgress}%\`
              }
            })
          })]
        }) : /*#__PURE__*/_jsxs("div", {
          className: \`\${baseClass}__dropzoneContent\`,`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/fields/Upload/index.scss',
    find: `    &__dragAndDropText {
      flex-shrink: 0;
      margin: 0;
      text-transform: lowercase;
      align-self: center;
      color: var(--theme-elevation-500);
    }

    &__loadingRows {`,
    replace: `    &__dragAndDropText {
      flex-shrink: 0;
      margin: 0;
      text-transform: lowercase;
      align-self: center;
      color: var(--theme-elevation-500);
    }

    &__inlineUpload {
      display: flex;
      flex-direction: column;
      gap: calc(var(--base) / 3);
      width: 100%;
    }

    &__inlineUploadText {
      color: var(--theme-elevation-600);
      font-size: 13px;
      line-height: 1;
    }

    &__inlineUploadTrack {
      background: var(--theme-elevation-150);
      border-radius: 999px;
      height: 6px;
      overflow: hidden;
      width: 100%;
    }

    &__inlineUploadBar {
      background: var(--theme-elevation-900);
      border-radius: inherit;
      height: 100%;
      transition: width 160ms ease;
    }

    &__loadingRows {`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    findStart: 'function Vh(t){let{AfterInput:e,allowCreate:o,api:r,BeforeInput:n,className:s,Description:i,description:l,displayPreview:a,Error:c,filterOptions:u,hasMany:d,isSortable:f,Label:m,label:p,localized:h,maxRows:g,onChange:b,path:C,readOnly:y,relationTo:v,required:x,serverURL:S,showError:w,style:F,value:I}=t,[R,D]=Fn.useState(),',
    findEnd: ',[T]=Fn.useState(Array.isArray(v)?v[0]:v),{openModal:_}=ne(),',
    replace: 'function Vh(t){let{AfterInput:e,allowCreate:o,api:r,BeforeInput:n,className:s,Description:i,description:l,displayPreview:a,Error:c,filterOptions:u,hasMany:d,isSortable:f,Label:m,label:p,localized:h,maxRows:g,onChange:b,path:C,readOnly:y,relationTo:v,required:x,serverURL:S,showError:w,style:F,value:I}=t,[R,D]=Fn.useState(),[inlineUploading,setInlineUploading]=Fn.useState(!1),[inlineUploadProgress,setInlineUploadProgress]=Fn.useState(0),[T]=Fn.useState(Array.isArray(v)?v[0]:v),{openModal:_}=ne(),',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: '{drawerSlug:A,setCollectionSlug:k,setInitialFiles:P,setMaxFiles:L,setOnSuccess:$,setSelectableCollections:B}=Ho(),{permissions:M}=_e(),',
    replace: '{drawerSlug:A,setCollectionSlug:k,setInitialFiles:P,setMaxFiles:L,setOnSuccess:$,setSelectableCollections:B}=Ho(),{getUploadHandler:inlineGetUploadHandler}=dd(),{permissions:M}=_e(),',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    optional: true,
    findStart: 'D([{relationTo:fe.collectionSlug,value:fe.doc}])}},[I,X,d,v,ve]),Oe=Fn.useCallback(',
    findEnd: ',Be=Fn.useCallback',
    replace: 'D([{relationTo:fe.collectionSlug,value:fe.doc}])}},[I,X,d,v,ve]),Oe=Fn.useCallback(async H=>{if(H?.length){let ce=H;if(!d&&H.length>1){let le=new DataTransfer;le.items.add(H[0]),ce=le.files}let fe=Array.from(ce),ie=Array.isArray(v)?T:v;if(typeof g=="number"&&d&&Array.isArray(I)&&(fe=fe.slice(0,Math.max(g-I.length,0))),!ie||!fe.length)return;setInlineUploading(!0),setInlineUploadProgress(0);let le=[];try{for(let Y=0;Y<fe.length;Y+=1){let K=fe[Y],ge=Math.round(Y/fe.length*100),re=Math.round((Y+1)/fe.length*100);setInlineUploadProgress(Math.max(5,ge));try{let pe=K,Te=inlineGetUploadHandler({collectionSlug:ie});if(pe&&typeof Te=="function"){let je=pe.name,Re=await Te({docPrefix:void 0,file:pe,updateFilename:We=>{je=We}});pe=JSON.stringify({clientUploadContext:Re,collectionSlug:ie,filename:je,mimeType:K.type,size:K.size})}let je=new FormData;je.append("_payload",JSON.stringify({})),pe&&je.append("file",pe);let Re=await new Promise((We,Lt)=>{let kt=new XMLHttpRequest;kt.open("POST",NU({apiRoute:r,path:"/"+ie})+kA.stringify({locale:N},{addQueryPrefix:!0})),kt.withCredentials=!0,kt.setRequestHeader("Accept-Language",j.language),kt.upload.onprogress=wo=>{wo.lengthComputable&&setInlineUploadProgress(Math.round(ge+wo.loaded/wo.total*(re-ge)))},kt.onload=()=>{let wo=null;try{wo=kt.responseText?JSON.parse(kt.responseText):null}catch{}We({json:wo,status:kt.status})},kt.onerror=()=>Lt(new Error("Upload failed")),kt.onabort=()=>Lt(new Error("Upload canceled")),kt.send(je)});Re.status===201&&Re.json?.doc?(le.push({collectionSlug:ie,doc:Re.json.doc}),setInlineUploadProgress(re)):ee.error(Re.json?.errors?.[0]?.message||Re.json?.message||"Upload failed")}catch(pe){ee.error(pe instanceof Error?pe.message:"Upload failed")}}le.length&&xe(le)}finally{setInlineUploading(!1),setInlineUploadProgress(0)}return}let ce=H,fe=Array.isArray(v)?T:v;ce&&P(ce),k(fe),Array.isArray(V)&&B(V),typeof g=="number"&&L(g),_(A)},[d,v,T,g,I,inlineGetUploadHandler,r,N,j.language,xe,k,V,_,A,P,B,L]),Be=Fn.useCallback',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    optional: true,
    find: '},[d,v,T,g,I,inlineGetUploadHandler,r,N,j.language,xe,k,V,_,A,P,B,L])(async(H,ce)=>',
    replace: '},[d,v,T,g,I,inlineGetUploadHandler,r,N,j.language,xe,k,V,_,A,P,B,L]),Be=Fn.useCallback(async(H,ce)=>',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'Ie?oo(xa,{disabled:y||!q,multipleFiles:d,onChange:Oe,',
    replace: 'Ie?oo(xa,{disabled:y||!q||inlineUploading,multipleFiles:d,onChange:Oe,',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'className:`${Un}__createNewToggler`,disabled:y||!q,onClick:()=>{y||(d?Oe():de())},',
    replace: 'className:`${Un}__createNewToggler`,disabled:y||!q||inlineUploading,onClick:()=>{y||(d?Oe():de())},',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'className:`${Un}__listToggler`,disabled:y,onClick:te,',
    replace: 'className:`${Un}__listToggler`,disabled:y||inlineUploading,onClick:te,',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'Ie?oo(xa,{disabled:y||!q||inlineUploading,multipleFiles:d,onChange:Oe,children:Fa("div",{className:`${Un}__dropzoneContent`,children:[Fa("div",{className:`${Un}__dropzoneContent__buttons`,children:[q&&Fa(Md,{children:[oo(oe,{buttonStyle:"pill",className:`${Un}__createNewToggler`,disabled:y||!q||inlineUploading,onClick:()=>{y||(d?Oe():de())},size:"small",children:O("general:createNew")}),oo("span",{className:`${Un}__dropzoneContent__orText`,children:O("general:or")})]}),oo(oe,{buttonStyle:"pill",className:`${Un}__listToggler`,disabled:y||inlineUploading,onClick:te,size:"small",children:O("fields:chooseFromExisting")}),oo(U,{onSave:Xe}),oo(Z,{allowCreate:q,enableRowSelections:d,onBulkSelect:Be,onSelect:he})]}),q&&!y&&Fa("p",{className:`${Un}__dragAndDropText`,children:[O("general:or")," ",O("upload:dragAndDrop")]})]})})',
    replace: 'Ie?oo(xa,{disabled:y||!q||inlineUploading,multipleFiles:d,onChange:Oe,children:inlineUploading?Fa("div",{className:`${Un}__inlineUpload`,children:[oo("div",{className:`${Un}__inlineUploadText`,children:"Uploading..."}),oo("div",{"aria-label":"Upload progress","aria-valuemax":100,"aria-valuemin":0,"aria-valuenow":inlineUploadProgress,className:`${Un}__inlineUploadTrack`,role:"progressbar",children:oo("div",{className:`${Un}__inlineUploadBar`,style:{width:`${inlineUploadProgress}%`}})})]}):Fa("div",{className:`${Un}__dropzoneContent`,children:[Fa("div",{className:`${Un}__dropzoneContent__buttons`,children:[q&&Fa(Md,{children:[oo(oe,{buttonStyle:"pill",className:`${Un}__createNewToggler`,disabled:y||!q||inlineUploading,onClick:()=>{y||(d?Oe():de())},size:"small",children:O("general:createNew")}),oo("span",{className:`${Un}__dropzoneContent__orText`,children:O("general:or")})]}),oo(oe,{buttonStyle:"pill",className:`${Un}__listToggler`,disabled:y||inlineUploading,onClick:te,size:"small",children:O("fields:chooseFromExisting")}),oo(U,{onSave:Xe}),oo(Z,{allowCreate:q,enableRowSelections:d,onBulkSelect:Be,onSelect:he})]}),q&&!y&&Fa("p",{className:`${Un}__dragAndDropText`,children:[O("general:or")," ",O("upload:dragAndDrop")]})]})})',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/elements/BulkUpload/FormsManager/index.js',
    find: `    if (successCount) {
      toast.success(\`Successfully saved \${successCount} files\`);
      setSuccessfullyUploaded(true);
      if (typeof onSuccess === 'function') {
        onSuccess(newDocs, errorCount_2);
      }
    }
    if (errorCount_2) {
      toast.error(\`Failed to save \${errorCount_2} files\`);
    } else {
      closeModal(drawerSlug);
    }
    dispatch({
      type: 'REPLACE',
      state: {
        activeIndex: remainingForms.reduce((acc_0, {
          formID
        }, i_2) => {
          if (formID === activeFormID) {
            return i_2;
          }
          return acc_0;
        }, 0),
        forms: remainingForms,
        totalErrorCount: remainingForms.reduce((acc_1, {
          errorCount: errorCount_3
        }) => acc_1 + errorCount_3, 0)
      }
    });
    if (remainingForms.length === 0) {
      setInitialFiles(undefined);
      setInitialForms(undefined);
    }`,
    replace: `    if (successCount) {
      toast.success(\`Successfully saved \${successCount} files\`);
      setSuccessfullyUploaded(true);
    }
    if (errorCount_2) {
      toast.error(\`Failed to save \${errorCount_2} files\`);
    } else {
      closeModal(drawerSlug);
    }
    dispatch({
      type: 'REPLACE',
      state: {
        activeIndex: remainingForms.reduce((acc_0, {
          formID
        }, i_2) => {
          if (formID === activeFormID) {
            return i_2;
          }
          return acc_0;
        }, 0),
        forms: remainingForms,
        totalErrorCount: remainingForms.reduce((acc_1, {
          errorCount: errorCount_3
        }) => acc_1 + errorCount_3, 0)
      }
    });
    if (remainingForms.length === 0) {
      setInitialFiles(undefined);
      setInitialForms(undefined);
    }
    if (successCount && typeof onSuccess === 'function') {
      try {
        onSuccess(newDocs, errorCount_2);
      } catch (error) {
        console.error('Payload bulk upload success callback failed', error);
      }
    }`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'pe&&(ee.success(`Successfully saved ${pe} files`),Z(!0),typeof O=="function"&&O(ge,Te)),Te?ee.error(`Failed to save ${Te} files`):L(B),D({type:"REPLACE",state:{activeIndex:re.reduce((je,{formID:Re},We)=>Re===K?We:je,0),forms:re,totalErrorCount:re.reduce((je,{errorCount:Re})=>je+Re,0)}}),re.length===0&&(V(void 0),z(void 0))',
    replace: 'pe&&(ee.success(`Successfully saved ${pe} files`),Z(!0)),Te?ee.error(`Failed to save ${Te} files`):L(B),D({type:"REPLACE",state:{activeIndex:re.reduce((je,{formID:Re},We)=>Re===K?We:je,0),forms:re,totalErrorCount:re.reduce((je,{errorCount:Re})=>je+Re,0)}}),re.length===0&&(V(void 0),z(void 0)),pe&&typeof O=="function"&&(()=>{try{O(ge,Te)}catch(je){console.error("Payload bulk upload success callback failed",je)}})()',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/elements/BulkUpload/FormsManager/index.js',
    findStart: `  const hasInitializedWithFiles = React.useRef(false);
`,
    findEnd: `  const baseAPIPath = formatAdminURL({`,
    replace: `  const hasInitializedWithFiles = React.useRef(false);
  const initialStateRef = React.useRef(null);
  const getFormDataRef = React.useRef(() => ({}));
  const baseAPIPath = formatAdminURL({`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/elements/BulkUpload/FormsManager/index.js',
    findStart: `    const currentFormsData_0 = getFormDataRef.current();
`,
    findEnd: `    const activeFormID = currentForms[activeIndex]?.formID;`,
    replace: `    const currentFormsData_0 = getFormDataRef.current();
    const currentForms = [...forms];
    if (currentForms[activeIndex]) {
      const existingFormState = currentForms[activeIndex].formState;
      currentForms[activeIndex] = {
        errorCount: currentForms[activeIndex].errorCount,
        formID: currentForms[activeIndex].formID,
        formState: {
          ...existingFormState,
          ...currentFormsData_0,
          file: currentFormsData_0.file?.value ? currentFormsData_0.file : existingFormState.file
        },
        uploadEdits: currentForms[activeIndex].uploadEdits
      };
    }
    const activeFormID = currentForms[activeIndex]?.formID;`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/elements/BulkUpload/FormsManager/index.js',
    findStart: `  React.useEffect(() => {
    if (!collectionSlug) {
`,
    findEnd: `  return /*#__PURE__*/_jsxs(Context, {`,
    replace: `  React.useEffect(() => {
    if (!collectionSlug) {
      return;
    }
    if (!hasInitializedState) {
      void initializeSharedFormState();
    }
    if (!hasInitializedDocPermissions) {
      void initializeSharedDocPermissions();
    }
    if (initialFiles || initialForms) {
      if (!hasInitializedState || !hasInitializedDocPermissions) {
        setIsInitializing(true);
      } else {
        setIsInitializing(false);
      }
    }
    if (hasInitializedState && (initialForms?.length || initialFiles?.length) && !hasInitializedWithFiles.current) {
      if (initialForms?.length) {
        void addInitialForms(initialForms);
      }
      if (initialFiles?.length) {
        void addFilesEffectEvent(initialFiles);
      }
      hasInitializedWithFiles.current = true;
    }
    return;
  }, [initialFiles, initializeSharedFormState, initializeSharedDocPermissions, collectionSlug, hasInitializedState, hasInitializedDocPermissions, initialForms]);
  return /*#__PURE__*/_jsxs(Context, {`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/elements/BulkUpload/ActionsBar/index.js',
    find: `import { EditManyBulkUploads } from '../EditMany/index.js';
import { useFormsManager } from '../FormsManager/index.js';`,
    replace: `import { EditManyBulkUploads } from '../EditMany/index.js';
import { useFormsManager } from '../FormsManager/index.js';
import { useBulkUpload } from '../index.js';`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/elements/BulkUpload/ActionsBar/index.js',
    find: `  const {
    collectionSlug,
    hasPublishPermission,
    hasSavePermission,
    saveAllDocs
  } = useFormsManager();
  let t1;`,
    replace: `  const {
    collectionSlug,
    hasPublishPermission,
    hasSavePermission,
    saveAllDocs
  } = useFormsManager();
  const {
    initialFiles
  } = useBulkUpload();
  const autoSaveInitialFiles = React.useRef(false);
  React.useEffect(() => {
    if (!initialFiles?.length || !hasSavePermission || autoSaveInitialFiles.current) {
      return;
    }
    autoSaveInitialFiles.current = true;
    const autoSaveTimeout = window.setTimeout(() => void saveAllDocs(), 0);
    return () => window.clearTimeout(autoSaveTimeout);
  }, [hasSavePermission, initialFiles, saveAllDocs]);
  let t1;`,
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    findStart: ',{collectionSlug:$,drawerSlug:B,folderID:M,initialFiles:N,initialForms:j,onSuccess:O,setInitialFiles:V,setInitialForms:z,setSuccessfullyUploaded:Z}=Ho(),[G,te]=wt.useState(!1),[U,J]=wt.useState(""),de=wt.useRef(!1)',
    findEnd: ',Q=wt.useRef(null),q=wt.useRef(()=>({})),X=bW',
    replace: ',{collectionSlug:$,drawerSlug:B,folderID:M,initialFiles:N,initialForms:j,onSuccess:O,setInitialFiles:V,setInitialForms:z,setSuccessfullyUploaded:Z}=Ho(),[G,te]=wt.useState(!1),[U,J]=wt.useState(""),de=wt.useRef(!1),Q=wt.useRef(null),q=wt.useRef(()=>({})),X=bW',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    findStart: ',Ie=wt.useCallback(async({overrides:ie}={})=>{let le=q.current(),Y=[..._];',
    findEnd: 'let K=Y[T]?.formID,ge=[];',
    replace: ',Ie=wt.useCallback(async({overrides:ie}={})=>{let le=q.current(),Y=[..._];if(Y[T]){let existingFormState=Y[T].formState;Y[T]={errorCount:Y[T].errorCount,formID:Y[T].formID,formState:{...existingFormState,...le,file:le.file?.value?le.file:existingFormState.file},uploadEdits:Y[T].uploadEdits}}let K=Y[T]?.formID,ge=[];',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    findStart: 'fe=wt.useCallback(()=>{D({type:"REPLACE",state:{forms:_.map(ie=>({...ie,uploadEdits:{}}))}})},[_]);return wt.useEffect(()=>{',
    findEnd: 'gW(uR',
    replace: 'fe=wt.useCallback(()=>{D({type:"REPLACE",state:{forms:_.map(ie=>({...ie,uploadEdits:{}}))}})},[_]);return wt.useEffect(()=>{$&&(v||xe(),S||ve(),(N||j)&&I(!v||!S),v&&(j?.length||N?.length)&&!de.current&&(j?.length&&Ge(j),N?.length&&he(N),de.current=!0))},[N,xe,ve,$,v,S,j]),gW(uR',
  },
  {
    file: 'node_modules/@payloadcms/ui/dist/exports/client/index.js',
    find: 'function ry(t){let e=xR(12),{className:o}=t,{getEntityConfig:r}=W(),{t:n}=E(),{collectionSlug:s,hasPublishPermission:i,hasSavePermission:l,saveAllDocs:a}=Wo(),c;',
    replace: 'function ry(t){let e=xR(12),{className:o}=t,{getEntityConfig:r}=W(),{t:n}=E(),{collectionSlug:s,hasPublishPermission:i,hasSavePermission:l,saveAllDocs:a}=Wo(),{initialFiles:autoInitialFiles}=Ho(),autoSaveInitialFiles=RW.useRef(!1);RW.useEffect(()=>{if(!autoInitialFiles?.length||!l||autoSaveInitialFiles.current)return;autoSaveInitialFiles.current=!0;let autoSaveTimeout=window.setTimeout(()=>{void a()},0);return()=>window.clearTimeout(autoSaveTimeout)},[autoInitialFiles,l,a]);let c;',
  },
  {
    file: 'node_modules/@payloadcms/storage-s3/dist/client/S3ClientUploadHandler.js',
    find: `        // upload the file directly to S3 using the signed URL
        await fetch(url, {
            body: file,
            headers: {
                'Content-Length': file.size.toString(),
                'Content-Type': file.type
            },
            method: 'PUT'
        });
        // return the docPrefix so the client can update the field value accordingly`,
    replace: `        // upload the file directly to S3 using the signed URL
        const uploadResponse = await fetch(url, {
            body: file,
            headers: {
                'Content-Type': file.type
            },
            method: 'PUT'
        });
        if (!uploadResponse.ok) {
            throw new Error(\`Failed to upload file to storage: \${uploadResponse.status} \${uploadResponse.statusText}\`);
        }
        // return the docPrefix so the client can update the field value accordingly`,
  },
  {
    file: 'node_modules/@payloadcms/storage-s3/dist/generateSignedURL.js',
    find: `        const signableHeaders = new Set();
        if (filesizeLimit) {
            if (filesize > filesizeLimit) {
                throw new APIError(\`Exceeded file size limit. Limit: \${bytesToMB(filesizeLimit).toFixed(2)}MB, got: \${bytesToMB(filesize).toFixed(2)}MB\`, 400);
            }
            // Still force S3 to validate
            signableHeaders.add('content-length');
        }
        const url = await getSignedUrl(getStorageClient(), new AWS.PutObjectCommand({
            ACL: acl,
            Bucket: bucket,
            ContentLength: filesizeLimit ? Math.min(filesize, filesizeLimit) : undefined,
            ContentType: mimeType,
            Key: fileKey
        }), {
            expiresIn: 600,
            signableHeaders
        });`,
    replace: `        if (filesizeLimit && filesize > filesizeLimit) {
            throw new APIError(\`Exceeded file size limit. Limit: \${bytesToMB(filesizeLimit).toFixed(2)}MB, got: \${bytesToMB(filesize).toFixed(2)}MB\`, 400);
        }
        const url = await getSignedUrl(getStorageClient(), new AWS.PutObjectCommand({
            ACL: acl,
            Bucket: bucket,
            ContentType: mimeType,
            Key: fileKey
        }), {
            expiresIn: 600
        });`,
  },
]

let applied = 0

for (const patch of patches) {
  const filePath = path.join(root, patch.file)

  if (!fs.existsSync(filePath)) {
    console.warn(`[patch-payload-bulk-upload] Missing ${patch.file}; skipping`)
    continue
  }

  const source = fs.readFileSync(filePath, 'utf8')

  if (!patch.always && source.includes(patch.replace)) {
    continue
  }

  let patchedSource

  if ('findStart' in patch && 'findEnd' in patch) {
    const startIndex = source.indexOf(patch.findStart)
    const endIndex = startIndex === -1 ? -1 : source.indexOf(patch.findEnd, startIndex + patch.findStart.length)

    if (startIndex === -1 || endIndex === -1) {
      if (patch.optional) {
        continue
      }
      throw new Error(`[patch-payload-bulk-upload] Could not find expected code in ${patch.file}`)
    }

    patchedSource = `${source.slice(0, startIndex)}${patch.replace}${source.slice(endIndex + patch.findEnd.length)}`
  } else {
    if (!source.includes(patch.find)) {
      if (patch.optional) {
        continue
      }
      throw new Error(`[patch-payload-bulk-upload] Could not find expected code in ${patch.file}`)
    }

    patchedSource = source.replace(patch.find, () => patch.replace)
  }

  fs.writeFileSync(filePath, patchedSource)
  applied += 1
}

if (applied > 0) {
  console.log(`[patch-payload-bulk-upload] Applied ${applied} Payload bulk upload patch${applied === 1 ? '' : 'es'}`)
}
