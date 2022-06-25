import { Engine, System, SystemType, TransformComponent, Input, Scene, Entity, ColliderComponent, GraphicsComponent, CoordPlane, BoundingBox, Particle, ParticleEmitter } from "excalibur";

export class PickerSystem extends System<TransformComponent> {
    public readonly types = ['ex.transform'] as const;
    public readonly systemType = SystemType.Update;
    public priority = 99;
  
    public lastFrameEntityToPointers = new Map<number, number[]>();
    public currentFrameEntityToPointers = new Map<number, number[]>();
    private _engine: Engine;
    private _receiver: Input.PointerEventReceiver;
  
    public initialize(scene: Scene): void {
      this._engine = scene.engine;
      this._receiver = this._engine.input.pointers;
    }
  
    public addPointerToEntity(entity: Entity, pointerId: number) {
      if (!this.currentFrameEntityToPointers.has(entity.id)) {
        this.currentFrameEntityToPointers.set(entity.id, [pointerId]);
        return;
      }
      const pointers = this.currentFrameEntityToPointers.get(entity.id);
      this.currentFrameEntityToPointers.set(entity.id, pointers.concat(pointerId));
    }
  
    private _processPointerToEntity(entities: Entity[]) {
      let transform: TransformComponent;
      let maybeCollider: ColliderComponent;
      let maybeGraphics: GraphicsComponent;
  
      // TODO probably a spatial partition optimization here to quickly query bounds for pointer
      // doesn't seem to cause issues tho for perf
  
      // Pre-process find entities under pointers
      for (const entity of entities) {
        // skip particles
        if (entity instanceof Particle) {
            continue;
        }
        transform = entity.get(TransformComponent);
        // Check collider contains pointer
        maybeCollider = entity.get(ColliderComponent);
        if (maybeCollider) {
          const geom = maybeCollider.get();
          if (geom) {
            for (const [pointerId, pos] of this._receiver.currentFramePointerCoords.entries()) {
              if (geom.contains(transform.coordPlane === CoordPlane.World ? pos.worldPos : pos.screenPos)) {
                this.addPointerToEntity(entity, pointerId);
              }
            }
          }
        }
  
        // Check graphics contains pointer
        maybeGraphics = entity.get(GraphicsComponent);
        if (maybeGraphics) {
          const graphicBounds = maybeGraphics.localBounds.transform(transform.get().matrix);
          for (const [pointerId, pos] of this._receiver.currentFramePointerCoords.entries()) {
            if (graphicBounds.contains(transform.coordPlane === CoordPlane.World ? pos.worldPos : pos.screenPos)) {
              this.addPointerToEntity(entity, pointerId);
            }
          }
        }
  
        // Synthetic geometry to help with the picking when no graphics or collider exist
        if (!(maybeGraphics?.current?.length) && !(maybeCollider?.get()) || entity instanceof ParticleEmitter) {
          const bounds = BoundingBox.fromDimension(100, 100).transform(transform.get().matrix);
          for (const [pointerId, pos] of this._receiver.currentFramePointerCoords.entries()) {
            if (bounds.contains(transform.coordPlane === CoordPlane.World ? pos.worldPos : pos.screenPos)) {
              this.addPointerToEntity(entity, pointerId);
            }
          }
        }
      }
    }
  
    update(entities: Entity[], _delta: number): void {
      this._processPointerToEntity(entities);
      this.lastFrameEntityToPointers.clear();
      this.lastFrameEntityToPointers = new Map<number, number[]>(this.currentFrameEntityToPointers);
      this.currentFrameEntityToPointers.clear();
    }
  }