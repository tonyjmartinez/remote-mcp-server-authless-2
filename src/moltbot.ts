export type TaskStatus = "pending" | "running" | "completed" | "failed";
export type TaskType = "data_processing" | "image_generation" | "report_generation" | "batch_calculation";

export interface OrchestrationTask {
	id: string;
	type: TaskType;
	status: TaskStatus;
	progress: number;
	createdAt: Date;
	startedAt?: Date;
	completedAt?: Date;
	result?: unknown;
	error?: string;
	params: Record<string, unknown>;
	messages: OrchestrationMessage[];
}

export interface OrchestrationMessage {
	timestamp: Date;
	from: string;
	to?: string;
	content: string;
}

export class MoltbotOrchestrator {
	private readonly tasks = new Map<string, OrchestrationTask>();

	createTask(type: TaskType, params: Record<string, unknown>, idPrefix = "task"): OrchestrationTask {
		const taskId = `${idPrefix}_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
		const agent = String(params.agent ?? "orchestrator");
		const prompt = typeof params.prompt === "string" ? params.prompt : undefined;
		const task: OrchestrationTask = {
			id: taskId,
			type,
			status: "pending",
			progress: 0,
			createdAt: new Date(),
			params,
			messages: [],
		};

		if (prompt) {
			task.messages.push({
				timestamp: new Date(),
				from: "orchestrator",
				to: agent,
				content: prompt,
			});
		}

		this.tasks.set(taskId, task);
		void this.processTask(taskId);
		return task;
	}

	createBatch(items: number[], operation: "square" | "cube" | "factorial") {
		const batchId = `batch_${Date.now()}`;
		const tasks = items.map((item, index) =>
			this.createTask("batch_calculation", { item, operation }, `${batchId}_${index}`),
		);

		return { batchId, tasks };
	}

	getTask(taskId: string) {
		return this.tasks.get(taskId);
	}

	listTasks(status: "all" | TaskStatus = "all") {
		const all = Array.from(this.tasks.values());
		return status === "all" ? all : all.filter(task => task.status === status);
	}

	getStats() {
		const allTasks = this.listTasks();
		return {
			total: allTasks.length,
			pending: allTasks.filter(t => t.status === "pending").length,
			running: allTasks.filter(t => t.status === "running").length,
			completed: allTasks.filter(t => t.status === "completed").length,
			failed: allTasks.filter(t => t.status === "failed").length,
			recent: allTasks.slice(-10).reverse(),
		};
	}

	private async processTask(taskId: string) {
		const task = this.tasks.get(taskId);
		if (!task) {
			return;
		}

		task.status = "running";
		task.startedAt = new Date();
		task.progress = 10;
		this.logMessage(task, {
			from: String(task.params.agent ?? "system"),
			to: "orchestrator",
			content: `Starting ${task.type} task.`,
		});

		const steps = [25, 50, 75, 90, 100];
		for (const progress of steps) {
			await new Promise(resolve => setTimeout(resolve, 500));
			task.progress = progress;
			this.maybeLogProgress(task, progress);
		}

		task.status = "completed";
		task.completedAt = new Date();
		task.result = this.buildResult(taskId, task);
		this.logMessage(task, {
			from: String(task.params.agent ?? "system"),
			to: "orchestrator",
			content: "Task finished. Handing back results.",
		});
	}

	private logMessage(task: OrchestrationTask, message: Omit<OrchestrationMessage, "timestamp">) {
		task.messages.push({
			timestamp: new Date(),
			...message,
		});
	}

	private maybeLogProgress(task: OrchestrationTask, progress: number) {
		const agent = String(task.params.agent ?? "agent");
		const peers = Array.isArray(task.params.peers) ? task.params.peers : [];
		if (progress === 25) {
			this.logMessage(task, {
				from: agent,
				to: "orchestrator",
				content: "Starting analysis and outlining approach.",
			});
		}
		if (progress === 50) {
			const peer = peers.find(name => name && name !== agent);
			if (peer) {
				this.logMessage(task, {
					from: agent,
					to: String(peer),
					content: "Sharing interim findings; let me know if you spot gaps.",
				});
			} else {
				this.logMessage(task, {
					from: agent,
					to: "orchestrator",
					content: "Halfway done; validating assumptions.",
				});
			}
		}
		if (progress === 75) {
			this.logMessage(task, {
				from: agent,
				to: "orchestrator",
				content: "Refining output and consolidating notes.",
			});
		}
		if (progress === 90) {
			this.logMessage(task, {
				from: agent,
				to: "orchestrator",
				content: "Final checks complete; preparing summary.",
			});
		}
	}

	private buildResult(taskId: string, task: OrchestrationTask) {
		switch (task.type) {
			case "data_processing":
				return {
					processed: task.params.records ?? 100,
					duration: Date.now() - task.createdAt.getTime(),
				};
			case "batch_calculation": {
				const item = Number(task.params.item ?? 0);
				const operation = String(task.params.operation ?? "square");
				let output = item * item;
				if (operation === "cube") {
					output = item * item * item;
				}
				if (operation === "factorial") {
					output = 1;
					for (let i = 2; i <= item; i++) {
						output *= i;
					}
				}
				return { input: item, operation, output };
			}
			case "image_generation":
				return {
					imageUrl: `https://placeholder.example/image_${taskId}.png`,
					format: "png",
					size: "1024x1024",
				};
			case "report_generation":
				return {
					reportUrl: `https://placeholder.example/report_${taskId}.pdf`,
					pages: Math.floor(Math.random() * 10) + 5,
				};
		}
	}
}
