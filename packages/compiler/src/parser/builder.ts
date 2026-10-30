import type {
  ResourceGraph,
  ApiRouteIR,
  TableIR,
  TableStreamConsumerIR,
  BucketIR,
  QueueIR,
  QueueConsumerIR,
  TopicIR,
  TopicSubscriberIR,
  AlarmIR,
  DeliveryStreamIR,
  AuthIR,
  EventBindingIR,
  ElectroEntityIR,
  BudgetIR,
} from "../types";
import { normalizeResourceGraph } from "../types";

export class ResourceGraphBuilder {
  public apis: ApiRouteIR[] = [];
  public tables: TableIR[] = [];
  public tableStreams: TableStreamConsumerIR[] = [];
  public buckets: BucketIR[] = [];
  public queues: QueueIR[] = [];
  public consumers: QueueConsumerIR[] = [];
  public topics: TopicIR[] = [];
  public topicSubscribers: TopicSubscriberIR[] = [];
  public alarms: AlarmIR[] = [];
  public deliveryStreams: DeliveryStreamIR[] = [];
  public auths: AuthIR[] = [];
  public bindings: EventBindingIR[] = [];
  public electroEntities: ElectroEntityIR[] = [];
  public budgets: BudgetIR[] = [];

  public build(): ResourceGraph {
    return normalizeResourceGraph({
      apis: this.apis,
      tables: this.tables,
      tableStreams: this.tableStreams,
      buckets: this.buckets,
      queues: this.queues,
      consumers: this.consumers,
      topics: this.topics,
      topicSubscribers: this.topicSubscribers,
      alarms: this.alarms,
      deliveryStreams: this.deliveryStreams,
      bindings: this.bindings,
      auths: this.auths,
      electroEntities: this.electroEntities,
      budgets: this.budgets,
    });
  }
}
