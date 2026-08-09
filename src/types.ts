export type ArticraftArtifactFormat = 'urdf' | 'usdz'
export type ArticraftSource = 'articraft-10k' | 'generated'
export type ArticraftJointType = 'fixed' | 'revolute' | 'continuous' | 'prismatic'

export type ArticraftCategory =
  | 'Appliances'
  | 'Architecture'
  | 'Electronics'
  | 'Furniture'
  | 'Robotics'
  | 'Tools'
  | 'Vehicles'
  | 'Other'

export type Vec3 = [number, number, number]

export type ArticraftPart = {
  name: string
  objectName?: string
}

export type ArticraftJoint = {
  name: string
  type: ArticraftJointType
  parent: string
  child: string
  axis: Vec3
  origin: {
    xyz: Vec3
    rpy: Vec3
  }
  limits: {
    lower: number
    upper: number
  } | null
}

export type ArticraftArtifact = {
  format: ArticraftArtifactFormat
  url: string
  sha256?: string
}

export type ArticraftAttribution = {
  creator: string
  license: string
  sourceUrl: string
  datasetRevision?: string
  sourceArchive?: string
}

export type ArticraftCatalogItem = {
  id: string
  title: string
  description?: string
  category?: ArticraftCategory
  source: ArticraftSource
  artifact: ArticraftArtifact
  thumbnailUrl?: string
  dimensions: Vec3
  parts: ArticraftPart[]
  joints: ArticraftJoint[]
  defaultJointValues: Record<string, number>
  attribution: ArticraftAttribution
  prompt?: string
  tags?: string[]
}

export type ArticraftCatalogResponse = {
  categories: Array<{
    count: number
    name: ArticraftCategory
  }>
  items: ArticraftCatalogItem[]
  page: number
  pageSize: number
  total: number
}

export type ArticraftProjectImage = {
  id: string
  name: string
  url: string
}

export type ArticraftReferenceRender = {
  errorText?: string
  id: string
  imageUrl?: string
  queuePosition?: number | null
  status: 'pending' | 'completed' | 'failed'
}

export type ArticraftGenerationStatus = 'queued' | 'running' | 'succeeded' | 'failed'

export type ArticraftGeneration = {
  id: string
  status: ArticraftGenerationStatus
  message?: string
  item?: ArticraftCatalogItem
}
