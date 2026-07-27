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

  if (source.includes(patch.replace)) {
    continue
  }

  let patchedSource

  if ('findStart' in patch && 'findEnd' in patch) {
    const startIndex = source.indexOf(patch.findStart)
    const endIndex = startIndex === -1 ? -1 : source.indexOf(patch.findEnd, startIndex + patch.findStart.length)

    if (startIndex === -1 || endIndex === -1) {
      throw new Error(`[patch-payload-bulk-upload] Could not find expected code in ${patch.file}`)
    }

    patchedSource = `${source.slice(0, startIndex)}${patch.replace}${source.slice(endIndex + patch.findEnd.length)}`
  } else {
    if (!source.includes(patch.find)) {
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
