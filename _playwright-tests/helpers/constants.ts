import path from 'path';

export const CENTOS_ARCHIVE = 'centos79.tar.gz';
export const BOOTC_ARCHIVE = 'image-mode-rhel94.tar.gz';
export const EDGE_ARCHIVE = 'edge-hbi-ui-stage.tar.gz';
export const PACKAGE_BASED_ARCHIVE = 'rhel94_core_collect.tar.gz';

export const RUN_ID = process.env.TEST_RUN_ID || 'local-run';
export const MANIFEST_PATH = path.join(
  'host_archives',
  `cleanup-manifest-${RUN_ID}.json`,
);
export const GLOBAL_DATA_PATH = path.resolve(
  __dirname,
  `../.global-data-${RUN_ID}.json`,
);
