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

  if (!source.includes(patch.find)) {
    throw new Error(`[patch-payload-bulk-upload] Could not find expected code in ${patch.file}`)
  }

  fs.writeFileSync(filePath, source.replace(patch.find, patch.replace))
  applied += 1
}

if (applied > 0) {
  console.log(`[patch-payload-bulk-upload] Applied ${applied} Payload bulk upload patch${applied === 1 ? '' : 'es'}`)
}
