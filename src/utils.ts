export function exit(): never {
  console.log("\nAborted.");
  process.exit(0);
}

export function withExitHandler<T>(promise: Promise<T>): Promise<T> {
  return promise.catch((e: Error) => {
    if (e.name === "ExitPromptError") exit();
    throw e;
  });
}
