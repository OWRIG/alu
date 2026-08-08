# 领域模型与工程文件

## 数据源优先级

1. `ProjectDocument` 是设计真相。
2. Catalog definitions 解释零件规格与组合关系。
3. BOM、切割表、加工表和 Three.js 场景都是可重新生成的投影。
4. BOM snapshot 只用于审计和漂移提示，不是重新打开工程后的计算真相。

## 坐标与数值

- `X`：左右、横跨方向。
- `Y`：前后、移动方向。
- `Z`：离地高度。
- 所有持久化长度单位均为 `mm`，角度为 `deg`。
- 几何比较初始容差为 `0.01 mm`；下单长度按对应目录的加工精度规则单独舍入。
- 工程中必须明确记录障碍物最外沿、内净空、骨架外尺寸和面板尺寸，不能用一个 `width` 混写。

## ProjectDocument v1

以下是结构草图，不是最终 TypeScript 实现：

```ts
type ProjectDocument = {
  formatVersion: 1
  projectId: string
  revision: number
  meta: {
    name: string
    createdAt: string
    updatedAt: string
    units: "mm"
  }
  parameters: Record<string, DimensionParameter>
  entities: Record<EntityId, Entity>
  connections: Record<ConnectionId, Connection>
  catalogLock: CatalogLockEntry[]
  manualBomLines: ManualBomLine[]
  bomAdjustments: BomAdjustment[]
  extensions?: Record<string, JsonValue>
}
```

实体不按画面层级嵌套，统一使用稳定 ID 和引用，避免删一个父对象时意外丢失可复用构件。

## 主要实体

### ProfileInstance

```ts
type ProfileInstance = {
  id: EntityId
  kind: "profile"
  definitionRef: PartRef
  origin: Vec3Mm
  axis: "x" | "y" | "z"
  lengthMm: number
  rotationAroundAxisDeg: 0 | 90 | 180 | 270
  purpose?: string
  endA: EndTreatment[]
  endB: EndTreatment[]
}
```

“起点 + 主轴 + 长度”比任意 4×4 矩阵更适合铝型材：可读、可校验，也方便生成加工端点和 BOM。特殊斜撑后续增加显式方向向量，不在 P1 让所有构件都进入自由矩阵模式。

### Connection

```ts
type Connection = {
  id: ConnectionId
  kind: "connection"
  endpoints: EndpointRef[]
  connectorRef: PartRef
  options: Record<string, JsonValue>
}
```

连接件 definition 描述兼容系列、占槽、伴随紧固件和所需加工。节点选择连接件后，BOM 和加工从同一 definition 派生。

### PanelInstance / CasterInstance / AccessoryInstance

板材保留长宽厚、安装方式和孔位；脚轮保留安装接口、安装总高、轮径、轮面、刹车和运动包络。它们都引用 catalog definition，不把供应商商品标题直接写进几何实体。

## 零件目录

```ts
type PartDefinition = {
  id: string
  revision: string
  kind: "profile" | "connector" | "fastener" | "caster" | "panel" | "accessory" | "custom"
  name: string
  unit: "piece" | "meter" | "millimeter" | "set" | "sheet"
  specification: Record<string, JsonValue>
  interfaces?: InterfaceDefinition[]
  bomComposition?: BomComponentRule[]
  procurement?: {
    vendor?: string
    sku?: string
    productUrl?: string
  }
  evidence?: EvidenceRef[]
  extensions?: Record<string, JsonValue>
}
```

身份是 `id + revision`，不是显示名、文件名或 SKU。SKU 和价格属于采购投影；同一物理接口可以存在多个供应商映射。

目录来源：

- `builtin`：随应用发布的已核验通用定义。
- `user`：用户本地创建。
- `vendor`：供应商适配器导入的快照。
- `embedded`：工程包为可移植性携带的引用快照。

解析优先级是工程内嵌快照 → 本地精确 revision → 缺失错误。绝不静默用“差不多”的新 revision 替换。

## BOM 三层

### 1. Derived

从实体、连接、加工与 definition 纯函数生成。每行包含稳定聚合键、数量、单位、尺寸/加工、来源实体 ID 和来源 rule/version。

### 2. Manual

用户主动增加的包装、工具、耗材或暂时无法建模的物料。它不假装由模型推导。

### 3. Adjustment

针对 derived 行的 `exclude`、`replace` 或 `quantityDelta`，必须有目标聚合键和可选原因。目标消失时调整变成 orphan warning，不能悄悄丢弃。

最终 BOM：

```text
final = applyAdjustments(derive(project, catalogs), adjustments) + manualLines
```

排序固定为：类别 → 规格 → 尺寸 → 加工 → 零件 ID。相同工程重算必须得到相同规范化 JSON 和内容哈希。

## `.alu` 工程包

`.alu` 是 ZIP 容器，v1 内容：

```text
example.alu
├── manifest.json
├── project.json
├── catalogs/
│   └── used-parts.json
├── bom/
│   └── snapshot.json
└── preview.png            # 可选
```

`manifest.json` 至少记录：

```json
{
  "mediaType": "application/vnd.alu.project+zip",
  "formatVersion": 1,
  "appVersion": "0.1.0",
  "projectId": "...",
  "createdAt": "...",
  "files": {
    "project": "project.json",
    "catalog": "catalogs/used-parts.json",
    "bomSnapshot": "bom/snapshot.json"
  }
}
```

所有被工程引用的零件 definition 都嵌入 `used-parts.json`，而不是只嵌入自定义项。这样即使内置目录升级或供应商下架，旧工程仍能准确打开。

## 导入、迁移与扩展

- 先解析 manifest，再按白名单读取条目；不做通用解压到磁盘。
- v1 schema 使用 Zod `.strict()`；跨工具扩展只能放入显式 `extensions`，禁止未知顶层字段被静默剥离。
- 迁移函数逐版本纯函数：`migrateV1ToV2`，每步有固定 fixture。
- 高于当前支持版本：只读元数据并提示升级，不尝试猜测。
- 导入定义冲突时，工程默认继续使用 embedded revision；只有用户明确操作才安装到个人目录。
- 保存前规范化、校验、生成哈希；主进程原子写入。

## AI 命令

```ts
type CommandEnvelope = {
  commandVersion: 1
  commandId: string
  expectedProjectRevision: number
  command:
    | AddProfileCommand
    | UpdateProfileCommand
    | RemoveEntityCommand
    | ConnectEndpointsCommand
    | AddPanelCommand
    | AddManualBomLineCommand
}
```

流程：Zod 校验 → revision 冲突检查 → dry-run → 规则评估 → 产出变更摘要 → 提交 → 进入统一撤销历史。AI、模板向导和 UI 最终走同一个 `applyCommand`，避免出现三套修改逻辑。

## 供应商适配

嘉立创等供应商只通过 adapter 把外部数据转换为 `PartDefinition`。adapter 保存来源 URL、抓取/导入时间、原始标识和内容哈希；价格与库存不写进工程真相。供应商页面变化只影响 adapter，不改领域 schema。
