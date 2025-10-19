# Code Execution Sandbox System

A scalable code execution system with **automatic language detection** that starts with Judge0 API and can be migrated to Docker containers later.

## 🧠 **NEW: Automatic Language Detection**

The system now automatically detects programming languages from code content and executes accordingly!

## Architecture

```
Frontend (Monaco Editor) → API Route → Executor Factory → Judge0/Docker → Results
```

## Current Implementation: Judge0 API

### Features
- ✅ **Automatic Language Detection** - No need to specify language manually
- ✅ Multi-language support (JavaScript, Python, Java, C++, C, TypeScript)
- ✅ Resource limits (time, memory)
- ✅ Secure sandboxed execution
- ✅ Real-time execution feedback
- ✅ Smart error handling with helpful suggestions
- ✅ Mobile-optimized interface
- ✅ TypeScript transpilation support

### Supported Languages

| Language   | Judge0 ID | Default Limits |
|------------|-----------|----------------|
| JavaScript | 63        | 5s, 128MB      |
| Python     | 71        | 10s, 256MB     |
| Java       | 62        | 15s, 512MB     |
| C++        | 54        | 10s, 256MB     |
| C          | 50        | 10s, 256MB     |
| TypeScript | 74        | 5s, 128MB      |

## Usage

### Basic Code Execution

```typescript
import { executeCode } from '@/lib/sandbox/client';

const result = await executeCode({
  code: 'console.log("Hello, World!");',
  language: 'javascript',
  userId: 'user-123' // Optional, for analytics
});

console.log(result.stdout); // "Hello, World!"
```

### In React Components

```tsx
import { ExecutionPanel } from '@/components/sandbox/ExecutionPanel';
import { executeCode } from '@/lib/sandbox/client';

function MyCodeEditor() {
  const [result, setResult] = useState(null);
  const [isExecuting, setIsExecuting] = useState(false);

  const handleRun = async () => {
    setIsExecuting(true);
    const result = await executeCode({
      code: userCode,
      language: 'python'
    });
    setResult(result);
    setIsExecuting(false);
  };

  return (
    <div>
      <CodeEditor onRunCode={handleRun} />
      <ExecutionPanel result={result} isLoading={isExecuting} />
    </div>
  );
}
```

## API Endpoints

### POST /api/execute
Execute code and return results.

**Request:**
```json
{
  "code": "print('Hello')",
  "language": "python",
  "input": "optional stdin",
  "timeLimit": 5,
  "memoryLimit": 128
}
```

**Response:**
```json
{
  "stdout": "Hello\n",
  "stderr": "",
  "exitCode": 0,
  "executionTime": 45,
  "memoryUsed": 1024,
  "status": "success"
}
```

### GET /api/execute/languages
Get supported languages.

**Response:**
```json
["javascript", "python", "java", "cpp", "c", "typescript"]
```

## Migration Path: Judge0 → Docker

The system is designed for easy migration:

1. **Current**: Judge0 API (free tier, external dependency)
2. **Future**: Docker containers (full control, self-hosted)

### Migration Steps

1. Implement `DockerExecutor` class
2. Update `ExecutorFactory` to switch executors
3. Deploy Docker infrastructure
4. Switch executor type in production

```typescript
// Future Docker implementation
export class DockerExecutor implements CodeExecutor {
  async execute(request: ExecutionRequest): Promise<ExecutionResult> {
    // Docker container execution logic
  }
}

// Switch executors
ExecutorFactory.getInstance().switchToDocker();
```

## Security Considerations

### Judge0 Security
- ✅ Sandboxed execution environment
- ✅ Resource limits enforced
- ✅ No network access in containers
- ✅ Input validation and sanitization

### Future Docker Security
- 🔄 Custom container images
- 🔄 Network isolation
- 🔄 File system restrictions
- 🔄 User privilege separation

## Performance

### Judge0 Performance
- **Latency**: ~2-5 seconds (includes network + queue time)
- **Throughput**: Limited by free tier quotas
- **Reliability**: Depends on Judge0 service availability

### Expected Docker Performance
- **Latency**: ~0.5-2 seconds (local execution)
- **Throughput**: Limited by server resources
- **Reliability**: Full control over infrastructure

## Monitoring & Analytics

The system tracks execution metrics:

```typescript
interface ExecutionMetrics {
  userId: string;
  language: string;
  executionTime: number;
  memoryUsed: number;
  status: ExecutionStatus;
  timestamp: Date;
  executor: 'judge0' | 'docker';
}
```

## Error Handling

The system provides user-friendly error messages:

- **Compilation errors**: Syntax issues, missing imports
- **Runtime errors**: Logic errors, exceptions
- **Resource limits**: Time/memory exceeded
- **System errors**: Network issues, service unavailable

## Testing

Use the test component to verify functionality:

```tsx
import TestExecutor from '@/components/sandbox/TestExecutor';

// Add to any page for testing
<TestExecutor />
```

## Configuration

### Environment Variables

```env
# Future Docker configuration
DOCKER_TIMEOUT=30
DOCKER_MEMORY_LIMIT=512
DOCKER_NETWORK_MODE=none

# Judge0 configuration (if using paid tier)
JUDGE0_API_KEY=your_api_key
JUDGE0_HOST=your_judge0_instance
```

### Language Configuration

Add new languages in `src/lib/sandbox/languages.ts`:

```typescript
export const SUPPORTED_LANGUAGES = {
  // ... existing languages
  rust: {
    id: 73, // Judge0 language ID
    name: 'rust',
    displayName: 'Rust',
    extension: 'rs',
    defaultTimeLimit: 10,
    defaultMemoryLimit: 256,
    monacoLanguage: 'rust'
  }
};
```

## Troubleshooting

### Common Issues

1. **"Unsupported language"**: Check language name in `languages.ts`
2. **"Execution timeout"**: Increase retry limits or check Judge0 status
3. **"Network error"**: Verify Judge0 API accessibility
4. **"Memory limit exceeded"**: Increase memory limits or optimize code

### Debug Mode

Enable debug logging:

```typescript
// In browser console
localStorage.setItem('sandbox-debug', 'true');
```

## Future Enhancements

- [ ] Real-time execution streaming
- [ ] Code collaboration features
- [ ] Advanced debugging tools
- [ ] Performance profiling
- [ ] Custom test case execution
- [ ] Code quality analysis
- [ ] Plagiarism detection