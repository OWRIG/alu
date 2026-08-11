# 领域模型与工程文件

## 数据源优先级

1. `ProjectDocument` 是设计真相。
2. Catalog definitions 解释零件规格与接口。
3. BOM、切割表、加工表、规则结果和 Three.js 场景都是可重新生成的投影。
4. BOM snapshot 只用于审计和漂移提示，不是重新打开工程后的计算真相。

## 版本边界

`formatVersion` 只表示 `ProjectDocument` 的 JSON schema 版本。物理容器与文档版本独立：当前 `.alu` 直接保存 JSON；未来需要二进制附件时可用 ZIP 包裹任意受支持的文档版本，ZIP manifest 使用独立的 `containerVersion`。

P1 的 `ProjectDocumentV1` 只固化核心 P1 语义：工程上下文、参数、绑定、型材实体、已引用型材 definition 和型材 BOM snapshot。向后兼容、可忽略的附加研究可进入有名字且内部版本化的 `extensions`；当前唯一被应用识别的是 `structuralSizing`。连接、加工、板材、脚轮、人工 BOM 与调整会改变核心设计与订单语义，不得用 `Record<string, JsonValue>` 占位进入 v1；对应 changeset 实现时先定义精确类型，再增加文档版本和纯函数迁移。

## 坐标、局部截面与数值

- 世界坐标 `X`：左右、横跨方向。
- 世界坐标 `Y`：前后、移动方向。
- 世界坐标 `Z`：离地高度。
- 型材局部 `s`：从 `origin` 指向长度正方向。
- 型材局部 `u/v`：截面二维坐标；`u × v = s`。
- `rotationAroundAxisDeg` 按右手规则绕 `+s` 旋转局部 `u/v`，相机方向不参与计算。
- 所有持久化长度单位均为 `mm`，角度为 `deg`。
- 几何比较初始容差为 `0.01 mm`；下单长度按对应目录的加工精度规则单独舍入。
- 所有持久化 mm 值在命令边界量化为 `0.01 mm` 的整数倍。
- 工程中必须明确记录障碍物最外沿、内净空、骨架外尺寸和面板尺寸，不能用一个 `width` 混写。

主轴在零旋转时使用固定右手基：

| `axis` / `s` | `u`  | `v`  |
| ------------ | ---- | ---- |
| `x` / `+X`   | `+Y` | `+Z` |
| `y` / `+Y`   | `+Z` | `+X` |
| `z` / `+Z`   | `+X` | `+Y` |

Renderer 只负责把该局部基映射到 three.js；three 坐标不得写回领域状态。

## 三种哈希

哈希名称必须表达用途，不使用含糊的“工程内容哈希”：

```ts
type ProjectHashes = {
  designHash: string;
  fileHash: string;
  bomHash: string;
};
```

哈希投影统一编码为 UTF-8 JSON：对象键递归按 Unicode code point 升序、数组保持顺序、无多余空白、拒绝非有限数值并把 `-0` 规范化为 `0`。磁盘文件仍按 schema 固定字段顺序与 2 空格缩进保存；只有 fileHash 直接覆盖最终文件字节。

- `designHash`：SHA-256(canonical design projection)。投影包含 context、参数、绑定、实体、连接/加工等当前版本设计字段和内嵌 definition 快照；排除 `projectId`、`revision`、整个 `meta`、BOM snapshot 和其他派生缓存。它用于 UI/CLI 结果一致性、dry-run 前后比较和“设计是否相同”。
- `fileHash`：SHA-256(完整规范化 `ProjectDocument` 字节)。包含 projectId、revision、meta 和可选 snapshot，用于一次保存结果的字节身份；不写回同一文档，避免自引用。
- `bomHash`：SHA-256(规范化 derived/final BOM 投影)，用于重算稳定性和 snapshot 漂移检查。
- `definitionHash`：SHA-256(规范化 `PartDefinition`)，保存在 `EmbeddedPartSnapshot` 包装层，不放进 definition 自身。

`applyCommand` 不读取系统时钟。命令提交只更新设计字段与 `revision`；`meta.updatedAt` 由成功保存流程写入，因此同一初始 `designHash` 和同一命令批经 UI/CLI 执行必须得到相同最终 `designHash`，但不要求 `fileHash` 相同。

## ProjectDocument v1

以下是 P1 的规范边界；最终 TypeScript 必须由 Zod schema 推导，不能另写一份漂移类型：

```ts
type ProjectDocumentV1 = {
  formatVersion: 1;
  projectId: string;
  revision: number;
  meta: {
    name: string;
    createdAt: string;
    updatedAt: string;
    appVersion: string;
    units: "mm";
  };
  context: ProjectContext;
  parameters: ParameterSet;
  bindings: ParameterBinding[];
  entities: Record<EntityId, ProfileInstance>;
  embeddedParts: Record<string, EmbeddedPartSnapshot<ProfileDefinition>>;
  bomSnapshot?: ProfileBomSnapshot;
  extensions?: Record<string, JsonValue>;
};
```

实体不按画面层级嵌套，统一使用稳定 ID 和引用。v1 不保存撤销历史、规则结果、Three.js 对象或未来阶段的空占位字段。

### 已知扩展：`structuralSizing` v1

`extensions.structuralSizing` 是可忽略但受当前 reader 严格校验的研究数据，不是开放字典。它保存：被研究梁 ID、有效跨度参数、独立截面高度上限参数、可选的实际截面宽/高参数、可空接口体系、梁数与载荷分配、弹性模量、挠度准则、具体候选 SKU 的质量/惯性矩/方向/接口体系/厂家来源，以及计算来源和可选构造证据。scope、假设、接口体系和证据来源使用开放稳定 ID，不绑定某一家厂商或平台。

解析时必须确认梁 ID 和参数存在、梁数与 ID 数量一致、候选 ID 唯一。挠度、应力、利用率和入选项都是当前 snapshot 的纯函数投影，不写入文件，避免参数变化后出现陈旧结论。未知扩展仍原样保留；已知扩展形状错误必须拒绝，而不是降级为“没有研究”。

## 工程上下文

B/E 类经验规则依赖的是场景事实，不是某根型材的属性：

```ts
type ProjectContext = {
  usage: string[];
  humanLoad: boolean | "unknown";
  childAccess: boolean | "unknown";
  mobility: "static" | "casters" | "unknown";
  floor: "wood" | "tile" | "carpet" | "concrete" | "unknown";
  loads: string[];
  notes?: string;
};
```

所有字段允许显式 `unknown`；`unknown` 触发待确认提示，不得被当成“安全”。

## 参数与尺寸链

v1 只使用线性组合，不引入公式字符串、表达式解释器或双向约束：

```ts
type ParameterSet = {
  inputs: Record<
    ParamId,
    {
      valueMm: number;
      label?: string;
      boundaryKind?:
        | "obstacle-outer"
        | "clearance"
        | "inner-clear"
        | "frame-outer"
        | "panel"
        | "height"
        | "generic";
    }
  >;
  derived: Record<
    ParamId,
    {
      label?: string;
      terms: { param: ParamId; coef: number }[];
      constantMm: number;
    }
  >;
};

type ParameterBinding = {
  entityId: EntityId;
  field: "lengthMm" | "origin.x" | "origin.y" | "origin.z";
  param: ParamId;
};
```

规则：

- 求值是纯函数：拓扑排序、单向传播。依赖成环触发 `dimension.parameter-cycle`。
- 创建绑定时字段立即写为参数值。`SetParametersCommand` 在一次命令内更新参数并同步所有处于同步态的绑定字段，一步撤销。
- 手工覆盖被绑定字段是允许的。命令执行前以旧参数值判断该绑定是否已失同步；失同步字段不被后续参数修改覆盖，直到用户重同步或解除绑定。
- 参数化模板 = 输入参数 + 派生公式 + 实体生成命令；不存在模板私有计算旁路。
- 编辑器与领域命令都支持输入/派生参数 upsert；删除仍被公式、绑定或选型研究引用的参数时明确拒绝，不做隐式级联。
- 出现真实的 min/max 或变量相乘需求时，通过 changeset 扩展版本化公式 AST。

## P1 型材实体

```ts
type ProfileInstance = {
  id: EntityId;
  kind: "profile";
  definitionRef: PartRef;
  origin: Vec3Mm;
  axis: "x" | "y" | "z";
  lengthMm: number;
  rotationAroundAxisDeg: 0 | 90 | 180 | 270;
  purpose: string;
  endCutA: EndCut;
  endCutB: EndCut;
};

type EndCut = { kind: "square" } | { kind: "miter"; angleDeg: number };
```

“起点 + 主轴 + 长度 + 局部截面旋转”比任意 4×4 矩阵更可读、可校验。特殊斜撑出现真实需求后增加显式方向向量并升级文档版本，不在 P1 预建自由矩阵。

`origin` 是端点 A 处的截面 referencePoint；P1 只支持 `envelope-center`。因此 Renderer、BOM 和未来连接投影不会因“起点取包络角点还是中心”产生隐式偏移。

端部只保留几何切型。孔、攻丝和沉孔属于后续加工模型，不在型材端点预留泛型字段。

## P1 型材 definition

P1 只需要能生成包络几何和型材切割 BOM 的强类型 definition：

```ts
type PartRef = { partId: string; revision: string };

type EvidenceRef = {
  kind: "vendor" | "standard" | "calculation" | "field-guide" | "user";
  reference: string;
  confidence: "high" | "medium" | "low";
};

type ProfileDefinition = {
  id: string;
  revision: string;
  kind: "profile";
  name: string;
  unit: "meter" | "millimeter";
  section: {
    envelopeUMm: number;
    envelopeVMm: number;
    representation: "rectangular-envelope" | "verified-t-slot";
    referencePoint: "envelope-center";
  };
  procurement?: {
    vendor?: string;
    sku?: string;
    productUrl?: string;
  };
  evidence: EvidenceRef[];
  extensions?: Record<string, JsonValue>;
};

type EmbeddedPartSnapshot<TDefinition> = {
  definition: TDefinition;
  definitionHash: string;
};
```

身份是 `id + revision`，不是显示名、文件名或 SKU。同一 key 的内嵌 snapshot 若 definitionHash 不同就是冲突，不允许覆盖。

解析优先级：工程内嵌精确 revision → 本地精确 revision → 缺失错误。绝不静默用“相近”revision 替换。

## P2 连接与接口的准入条件

以下是 P2 schema 必须满足的形状约束，不属于 `ProjectDocumentV1`：

```ts
type ProfileSide = "+u" | "-u" | "+v" | "-v";

type ProfileInterfaceDefinition =
  | { id: string; kind: "end-center"; endCapability: string }
  | {
      id: string;
      kind: "slot";
      side: ProfileSide;
      slotIndex: number;
      slotWidthMm: number | "unknown";
    }
  | { id: string; kind: "mounting-face"; side: ProfileSide };

type EndpointRef =
  | { kind: "profile-end"; profileId: EntityId; end: "a" | "b"; interfaceId: string }
  | { kind: "profile-side"; profileId: EntityId; interfaceId: string; offsetMm: number };

type Connection = {
  id: ConnectionId;
  kind: "connection";
  endpoints: EndpointRef[];
  connectorRef: PartRef;
  variantId?: string;
};
```

- `interfaceId` 必须解析到精确 definition revision 中的稳定接口；槽面与占槽不能只靠世界轴 `+x/-x` 猜测。
- `offsetMm` 沿局部 `s` 从 origin 量取；端面使用 `profile-end`，不能伪装成侧面 offset。
- `variantId` 只能选择 connector definition 中声明的强类型变体。不得使用开放的 `options: Record<string, JsonValue>` 承载影响 BOM、加工或兼容性的事实。
- Connector、fastener、panel、caster、accessory definition 必须各自成为判别联合成员，拥有规则真正消费的明确字段；`specification: Record<string, JsonValue>` 不能进入中性核心模型。
- 连接、加工、板材、脚轮和完整 BOM 类型评审通过后，才升级文档 schema 并实现 v1 迁移。

## BOM

P1 只生成 derived profile BOM。每行包含稳定聚合键、型材 definition revision、切长、截面朝向、用途、数量和来源实体 ID。

排序固定为：型材规格 → 切长 → 截面朝向 → 用途 → definition ID。相同 designHash 重算必须得到相同 BOM JSON 和 bomHash。

P3 再增加：

1. `Manual`：用户主动增加的包装、工具、耗材或暂时无法建模的物料。
2. `Adjustment`：针对 derived 聚合键的 exclude、replace 或 quantityDelta；目标消失时保留为 orphan finding。

届时 final BOM 才定义为：

```text
final = applyAdjustments(derive(project, catalogs), adjustments) + manualLines
```

## `.alu` 工程文件

当前 `.alu` 是规范化 JSON（UTF-8、固定键序、2 空格缩进、量化数值）：

- 所有被引用的 P1 profile definition 都以内嵌 snapshot 保存，内置目录升级后旧工程仍能打开。
- 保存：更新 `meta.updatedAt` → 规范化 → Zod 校验 → 计算 fileHash → 同目录临时文件 → flush → rename。
- 初始上限：JSON ≤ 8 MiB、实体 ≤ 10,000、内嵌定义 ≤ 2,000、参数 ≤ 1,000。
- 预览图按 `projectId + revision` 存在 userData 派生缓存，不进入工程文件。
- 接收方打开后重算 BOM；snapshot 不一致时比较 bomHash 并显示漂移。

未来需要照片、图纸等二进制资产时，读取端通过文件头区分 `{` 与 `PK`。ZIP manifest 使用独立 `containerVersion: 1`，并包含 `project.json` 自己的 `formatVersion`；启用时必须同时实现条目白名单、大小上限、重复条目拒绝、绝对路径/`..`/符号链接拒绝。不得把 ZIP 容器称为“文档 v2”。

## 导入、迁移与扩展

- 每个 `formatVersion` 使用独立严格 Zod schema；未知顶层字段是错误，扩展只能进入 `extensions`。
- 应用识别的扩展必须有内部 `version`、精确 schema 与语义引用校验；未知扩展可以保留但不参与规则或派生产物。
- 后续行为需要新字段时升级文档版本，不在 v1 静默增加旧 reader 会拒绝的字段。
- 迁移函数逐版本纯函数，例如 `migrateV1ToV2`；每步有固定 fixture、幂等包装和 designHash 语义说明。
- 高于当前支持版本：只读最小文件头/元数据并提示升级，不猜测降级。
- 超限、损坏 JSON、非有限数值和 definitionHash 不匹配拒绝导入，错误可定位。

## 命令信封、并发与重试

```ts
type CommandEnvelope = {
  commandVersion: 1;
  commandId: string; // 请求关联 ID；用于日志和错误回传
  expectedProjectRevision: number; // 乐观并发与防重复写入
  commands: DomainCommand[]; // 1..N，整批原子
};
```

`commandId` 不承诺跨进程持久幂等。当前没有 command receipt ledger，CLI 也是无状态进程，因此把它描述成“幂等去重”是不真实的。安全重试协议是：

1. 调用方携带读取时的 `expectedProjectRevision` 和 `designHash`。
2. 成功批次只增加一次 revision。
3. 响应丢失后原样重试会收到 `revision.conflict`，不会静默再次应用。
4. 调用方重新读取 revision/designHash；若结果已达到预期则结束，否则基于新 revision 重新 dry-run。

只有出现必须“重试返回原成功响应”的真实宿主需求时，才通过 changeset 增加有界、持久化 command receipt；此前不预建 ledger。

命令流程：Zod 校验 → revision 冲突检查 → dry-run → 规则评估 → 变更摘要 → 原子提交 → 进入统一撤销历史。新增实体 ID 由调用方提供，同批后续命令可引用；任一命令失败整批不落地。

```ts
type DryRunResult = {
  ok: boolean;
  projectRevision: number;
  designHashBefore: string;
  designHashAfter?: string;
  entities: { added: EntityId[]; updated: EntityId[]; removed: EntityId[] };
  parameters: { changed: ParamId[]; staleBindings: number };
  rules: { newFindings: RuleFinding[]; resolved: string[] };
  bomDelta: { added: number; removed: number; changed: number };
  errors?: CommandError[];
};
```

项目快照、参数、BOM、规则和目录读取均返回 `projectRevision + designHash`。UI、模板和未来 CLI 共享同一命令内核；优先修改参数，不逐根型材重复报坐标。

## 供应商适配

嘉立创等供应商只通过 adapter 转换为当前文档版本支持的判别式 `PartDefinition`。adapter 保存来源 URL、导入时间、原始标识和 definitionHash；价格与库存不写进设计真相。字段缺失显式为 `unknown` 或拒绝进入需要该字段的 definition 类型，不用猜测补齐。
