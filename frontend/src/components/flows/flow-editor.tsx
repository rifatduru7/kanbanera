import { useState, useCallback, useRef, useMemo } from 'react';
import {
    ReactFlow,
    Controls,
    Background,
    BackgroundVariant,
    addEdge,
    useNodesState,
    useEdgesState,
    type Connection,
    type Edge,
    type Node,
    MarkerType,
    Panel,
    MiniMap,
} from '@xyflow/react';
import '@xyflow/react/dist/style.css';
import { nodeTypes } from './flow-nodes';
import { Save, ArrowLeft, Play, Zap, GitBranch } from 'lucide-react';
import toast from 'react-hot-toast';

const RF_STYLES = `
    .react-flow__controls-button {
        background: #1b2b32 !important;
        border-bottom: 1px solid rgba(255,255,255,0.05) !important;
        fill: #28aae2 !important;
    }
    .react-flow__controls-button:hover {
        background: #28aae220 !important;
    }
    .react-flow__minimap {
        background-color: #111c21 !important;
    }
    .react-flow__attribution {
        background: transparent !important;
        color: rgba(255,255,255,0.1) !important;
    }
`;

interface FlowEditorProps {
    initialNodes: Node[];
    initialEdges: Edge[];
    onSave: (nodes: Node[], edges: Edge[]) => Promise<void>;
    onExecute?: () => void;
    onBack: () => void;
    flowName: string;
    isActive: boolean;
}

const PALETTE_ITEMS = [
    { type: 'triggerNode', label: 'Tetikleyici', icon: Zap, color: '#f59e0b', description: 'Akışı başlatan olay' },
    { type: 'conditionNode', label: 'Koşul', icon: GitBranch, color: '#3b82f6', description: 'Dallanma mantığı' },
    { type: 'actionNode', label: 'Aksiyon', icon: Play, color: '#10b981', description: 'Yapılacak işlem' },
];

let nodeIdCounter = 0;
function getNodeId() {
    return `node_${Date.now()}_${nodeIdCounter++}`;
}

export function FlowEditor({ initialNodes, initialEdges, onSave, onExecute, onBack, flowName, isActive }: FlowEditorProps) {
    const reactFlowWrapper = useRef<HTMLDivElement>(null);
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const [isSaving, setIsSaving] = useState(false);
    const [reactFlowInstance, setReactFlowInstance] = useState<ReturnType<typeof Object> | null>(null);
    const [isSidebarOpen, setIsSidebarOpen] = useState(window.innerWidth > 1024);

    // Close sidebar on mobile on resize if needed, but simple state is fine
    // Callback to allow nodes to update their own data
    const handleNodeDataChange = useCallback((nodeId: string, field: string, value: string) => {
        setNodes((nds) =>
            nds.map((node) => {
                if (node.id === nodeId) {
                    return {
                        ...node,
                        data: { ...node.data, [field]: value },
                    };
                }
                return node;
            })
        );
    }, [setNodes]);

    // Inject the onChange callback into every node's data
    const nodesWithCallbacks = useMemo(() => {
        return nodes.map((node) => ({
            ...node,
            data: { ...node.data, onChange: handleNodeDataChange },
        }));
    }, [nodes, handleNodeDataChange]);

    const onConnect = useCallback(
        (params: Connection) => {
            setEdges((eds) =>
                addEdge(
                    {
                        ...params,
                        animated: true,
                        style: { stroke: '#28aae2', strokeWidth: 2 },
                        markerEnd: { type: MarkerType.ArrowClosed, color: '#28aae2' },
                    },
                    eds
                )
            );
        },
        [setEdges]
    );

    const onDragOver = useCallback((event: React.DragEvent) => {
        event.preventDefault();
        event.dataTransfer.dropEffect = 'move';
    }, []);

    const onDrop = useCallback(
        (event: React.DragEvent) => {
            event.preventDefault();
            const type = event.dataTransfer.getData('application/reactflow');
            if (!type || !reactFlowWrapper.current || !reactFlowInstance) return;

            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = (reactFlowInstance as { screenToFlowPosition: (p: { x: number; y: number }) => { x: number; y: number } }).screenToFlowPosition({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            });

            const newNode: Node = {
                id: getNodeId(),
                type,
                position,
                data: {
                    label: type === 'triggerNode' ? 'Tetikleyici' : type === 'conditionNode' ? 'Koşul' : 'Aksiyon',
                    triggerType: '',
                    triggerValue: '',
                    conditionType: '',
                    conditionValue: '',
                    actionType: '',
                    actionValue: '',
                },
            };

            setNodes((nds) => [...nds, newNode]);
            
            // Auto close sidebar on mobile after drop
            if (window.innerWidth < 1024) {
                setIsSidebarOpen(false);
            }
        },
        [reactFlowInstance, setNodes]
    );

    const handleSave = async () => {
        setIsSaving(true);
        try {
            // Strip onChange callbacks before saving
            const cleanNodes = nodes.map((n) => ({
                id: n.id,
                type: n.type,
                position: n.position,
                data: {
                    label: (n.data as Record<string, unknown>).label,
                    triggerType: (n.data as Record<string, unknown>).triggerType,
                    triggerValue: (n.data as Record<string, unknown>).triggerValue,
                    conditionType: (n.data as Record<string, unknown>).conditionType,
                    conditionValue: (n.data as Record<string, unknown>).conditionValue,
                    actionType: (n.data as Record<string, unknown>).actionType,
                    actionValue: (n.data as Record<string, unknown>).actionValue,
                },
            }));
            const cleanEdges = edges.map((e) => ({
                id: e.id,
                source: e.source,
                target: e.target,
                sourceHandle: e.sourceHandle,
                targetHandle: e.targetHandle,
                type: e.type,
            }));
            await onSave(cleanNodes as Node[], cleanEdges as Edge[]);
            toast.success('Akış kaydedildi!');
        } catch {
            toast.error('Kaydetme hatası');
        } finally {
            setIsSaving(false);
        }
    };

    const onDragStart = (event: React.DragEvent, nodeType: string) => {
        event.dataTransfer.setData('application/reactflow', nodeType);
        event.dataTransfer.effectAllowed = 'move';
    };

    return (
        <div className="flex h-screen w-screen bg-[#0a0f12] overflow-hidden text-text selection:bg-primary/30">
            <style>{RF_STYLES}</style>
            {/* Left Palette - Absolute on mobile, Sidebar on desktop */}
            <div className={`
                fixed lg:relative z-[60] h-full bg-[#111c21]/95 lg:bg-surface/50 backdrop-blur-xl border-r border-white/5 shadow-2xl transition-all duration-300 ease-in-out
                ${isSidebarOpen ? 'w-72 translate-x-0' : 'w-0 -translate-x-full lg:translate-x-0 lg:w-0'}
            `}>
                <div className="w-72 flex flex-col h-full">
                    <div className="p-6 border-b border-white/5">
                        <div className="flex items-center justify-between mb-2">
                            <h3 className="text-xs font-bold text-primary uppercase tracking-[0.2em]">Bileşenler</h3>
                            <button onClick={() => setIsSidebarOpen(false)} className="lg:hidden p-1 hover:bg-white/5 rounded-lg">
                                <ArrowLeft className="size-4" />
                            </button>
                        </div>
                        <p className="text-[10px] text-text-muted">Sürükleyip kanvasa bırakın</p>
                    </div>
                    
                    <div className="p-4 flex flex-col gap-3 flex-1 overflow-y-auto custom-scrollbar">
                        {PALETTE_ITEMS.map((item) => (
                            <div
                                key={item.type}
                                draggable
                                onDragStart={(e) => onDragStart(e, item.type)}
                                className="group relative flex items-center gap-3 p-4 rounded-2xl border border-white/5 bg-white/[0.02] cursor-grab active:cursor-grabbing hover:bg-white/[0.05] hover:border-white/10 transition-all duration-300"
                            >
                                <div 
                                    className="absolute left-0 top-1/2 -translate-y-1/2 w-1.5 h-8 rounded-r-full transition-all duration-300"
                                    style={{ background: item.color }}
                                />
                                <div 
                                    className="size-10 rounded-xl flex items-center justify-center shrink-0 shadow-lg"
                                    style={{ background: `${item.color}15`, boxShadow: `0 0 20px ${item.color}10` }}
                                >
                                    <item.icon className="size-5" style={{ color: item.color }} />
                                </div>
                                <div className="min-w-0">
                                    <p className="text-sm font-bold text-text group-hover:text-primary transition-colors">{item.label}</p>
                                    <p className="text-[10px] text-text-muted leading-tight mt-0.5">{item.description}</p>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-white/5 bg-black/20">
                        <p className="text-[10px] text-primary/60 mb-3 font-bold uppercase tracking-wider">İpucu</p>
                        <p className="text-[10px] text-text-muted leading-relaxed">
                            Bir bileşeni seçip kanvasa sürükleyin. Ardından uç noktalarından tutup diğer bileşenlere bağlayın.
                        </p>
                    </div>
                </div>
            </div>

            {/* Canvas Area */}
            <div className="flex-1 relative bg-[radial-gradient(circle_at_center,_var(--tw-gradient-stops))] from-[#111c21] via-[#0d151a] to-[#0a0f12]">
                <div className="absolute inset-0" ref={reactFlowWrapper}>
                    <ReactFlow
                        nodes={nodesWithCallbacks}
                        edges={edges}
                        onNodesChange={onNodesChange}
                        onEdgesChange={onEdgesChange}
                        onConnect={onConnect}
                        onInit={(instance) => setReactFlowInstance(instance)}
                        onDrop={onDrop}
                        onDragOver={onDragOver}
                        nodeTypes={nodeTypes}
                        fitView
                        deleteKeyCode={['Backspace', 'Delete']}
                        proOptions={{ hideAttribution: true }}
                        defaultEdgeOptions={{
                            animated: true,
                            style: { stroke: '#28aae2', strokeWidth: 2.5 },
                            markerEnd: { type: MarkerType.ArrowClosed, color: '#28aae2' },
                        }}
                    >
                        <Background variant={BackgroundVariant.Dots} gap={24} size={1} color="rgba(40, 170, 226, 0.1)" />
                        
                        {/* Toolbar */}
                        <Panel position="top-center" className="w-full sm:w-auto px-4 mt-4">
                            <div className="flex items-center gap-2 sm:gap-4 px-4 py-2.5 rounded-2xl bg-[#111c21]/80 backdrop-blur-xl border border-white/10 shadow-[0_20px_50px_rgba(0,0,0,0.5)]">
                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={onBack}
                                        title="Geri Dön"
                                        className="p-2 rounded-xl text-text-muted hover:text-text hover:bg-white/5 transition-all outline-none"
                                    >
                                        <ArrowLeft className="size-5" />
                                    </button>
                                    
                                    <button
                                        onClick={() => setIsSidebarOpen(!isSidebarOpen)}
                                        title="Bileşenler"
                                        className={`p-2 rounded-xl transition-all outline-none ${isSidebarOpen ? 'bg-primary/20 text-primary' : 'text-text-muted hover:text-text hover:bg-white/5'}`}
                                    >
                                        <Zap className="size-5" />
                                    </button>
                                </div>

                                <div className="hidden sm:block h-6 w-px bg-white/10" />

                                <div className="flex-1 sm:flex-none min-w-0 px-2">
                                    <h1 className="text-sm font-bold text-text truncate max-w-[120px] sm:max-w-[200px]">
                                        {flowName}
                                    </h1>
                                    <div className="flex items-center gap-1.5 mt-0.5">
                                        <div className={`size-1.5 rounded-full ${isActive ? 'bg-green-500 animate-pulse' : 'bg-white/20'}`} />
                                        <span className="text-[10px] font-bold text-text-muted uppercase tracking-wider">
                                            {isActive ? 'Aktif' : 'Pasif'}
                                        </span>
                                    </div>
                                </div>

                                <div className="h-6 w-px bg-white/10" />

                                <div className="flex items-center gap-2">
                                    <button
                                        onClick={handleSave}
                                        disabled={isSaving}
                                        className="flex items-center gap-2 px-4 py-2 rounded-xl bg-primary text-black text-xs font-black uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all disabled:opacity-50 shadow-lg shadow-primary/20"
                                    >
                                        <Save className="size-4" />
                                        <span className="hidden sm:inline">{isSaving ? 'Kaydediliyor...' : 'Kaydet'}</span>
                                    </button>

                                    {onExecute && (
                                        <button
                                            onClick={onExecute}
                                            className="flex items-center justify-center p-2 sm:px-4 sm:py-2 rounded-xl bg-emerald-500 text-black text-xs font-black uppercase tracking-wider hover:scale-[1.02] active:scale-[0.98] transition-all shadow-lg shadow-emerald-500/20"
                                        >
                                            <Play className="size-4" />
                                            <span className="hidden sm:inline ml-2">Çalıştır</span>
                                        </button>
                                    )}
                                </div>
                            </div>
                        </Panel>

                        <Controls className="!bg-[#111c21] !border-white/10 !rounded-2xl !p-1 !shadow-2xl sm:!mb-20 !flex !flex-row sm:!flex-col !gap-1" />
                        <MiniMap 
                            className="!bg-[#111c21]/80 !border-white/10 !rounded-2xl !overflow-hidden !shadow-2xl hidden sm:block"
                            maskColor="rgba(0, 0, 0, 0.5)"
                            nodeColor={(node) => {
                                if (node.type === 'triggerNode') return '#f59e0b';
                                if (node.type === 'conditionNode') return '#3b82f6';
                                if (node.type === 'actionNode') return '#10b981';
                                return '#28aae2';
                            }}
                            nodeStrokeWidth={3}
                            zoomable
                            pannable
                        />
                    </ReactFlow>
                </div>
            </div>
            
            {/* Mobile Palette Overlay */}
            {isSidebarOpen && (
                <div 
                    className="fixed inset-0 bg-black/60 backdrop-blur-sm z-[55] lg:hidden animate-in fade-in duration-300"
                    onClick={() => setIsSidebarOpen(false)}
                />
            )}
        </div>
    );
}

export default FlowEditor;
