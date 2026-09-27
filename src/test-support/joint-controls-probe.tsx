import { renderToStaticMarkup } from 'react-dom/server'
import { stubHostModules } from './host-stubs'

// Renders the Articraft inspector against stubbed host packages and prints
// the props every SliderControl received.
const NODE_ID = 'articraft_probe'
const node = {
  id: NODE_ID,
  type: 'articraft:asset',
  position: [0, 0, 0],
  rotation: [0, 0, 0],
  scale: 1,
  joints: [
    {
      name: 'lid',
      type: 'revolute',
      parent: 'base',
      child: 'lid',
      axis: [0, 0, 1],
      origin: { xyz: [0, 0, 0], rpy: [0, 0, 0] },
      limits: { lower: 0, upper: 1.5 },
    },
    {
      name: 'drawer',
      type: 'prismatic',
      parent: 'base',
      child: 'drawer',
      axis: [1, 0, 0],
      origin: { xyz: [0, 0, 0], rpy: [0, 0, 0] },
      limits: { lower: 0, upper: 0.4 },
    },
  ],
  jointValues: {},
  attribution: { creator: 'Articraft authors', license: 'CC-BY-4.0', sourceUrl: 'https://x.test' },
}
const sliders: Array<{ label: string; restoreOnCommit: unknown }> = []
const state = { nodes: { [NODE_ID]: node }, updateNode: () => undefined }

stubHostModules({
  '@pascal-app/core': {
    useInteractive: Object.assign((select: (value: object) => unknown) => select({}), {
      getState: () => ({}),
    }),
    useScene: Object.assign((select: (value: typeof state) => unknown) => select(state), {
      getState: () => state,
    }),
  },
  '@pascal-app/editor': {
    PanelSection: ({ children }: { children?: unknown }) => children,
    SliderControl: (props: { label: string; restoreOnCommit?: boolean }) => {
      sliders.push({ label: props.label, restoreOnCommit: props.restoreOnCommit ?? 'default' })
      return null
    },
  },
  '@pascal-app/viewer': {
    useViewer: (select: (value: unknown) => unknown) =>
      select({ selection: { selectedIds: [NODE_ID] } }),
  },
})

const { default: ArticraftJointControls } = await import('../joint-controls')
renderToStaticMarkup(<ArticraftJointControls />)
console.log(JSON.stringify(sliders))
