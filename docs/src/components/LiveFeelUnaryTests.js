import React from "react";
import axios from "axios";
import Editor from "@site/src/components/Editor";
import CodeBlock from "@theme/CodeBlock";


const LiveFeelUnaryTests = ({
  defaultExpression,
  feelInputValue,
  feelContext,
  metadata,
  onResultCallback,
  onErrorCallback,
}) => {
  if (feelContext) {
    // format the context
    feelContext = JSON.stringify(JSON.parse(feelContext), null, 2);
  }

  const [expression, setExpression] = React.useState(defaultExpression);
  const [inputValue, setInputValue] = React.useState(feelInputValue);
  const [context, setContext] = React.useState(feelContext);
  const [result, setResult] = React.useState(
    "<click 'Evaluate' to see the result of the expression>"
  );
  const [error, setError] = React.useState(null);
  const [warnings, setWarnings] = React.useState(null);

  // https://regex101.com/r/WnWTtz/1
  const errorPattern = /^.+(?<line>\d+):(?<position>\d+).+$/gm;

  // https://regex101.com/r/jus80g/1
  const contextErrorPattern = /^.+at position (?<position>\d+)$/gm;

  const parseContext = () => {
    if (!feelContext  || context.trim().length === 0) {
      return {};
    }
    return JSON.parse(context);
  };

  const parseInputValue = () => {
    if (!feelInputValue || inputValue.trim().length === 0) {
      return null;
    }
    return JSON.parse(inputValue);
  };

  function tryEvaluate() {
    try {
      // to indicate the progress
      setResult("<evaluating the expression...>");
      setWarnings(null)

      const parsedContext = parseContext();
      const parsedInputValue = parseInputValue();

      evaluate(parsedContext, parsedInputValue);
    } catch (err) {
      const match = contextErrorPattern.exec(err.message);
      onError({
        message: `failed to parse context: ${err.message}`,
        position: match?.groups?.position,
      });
    }
  }

  function evaluate(parsedContext, parsedInputValue) {
    axios
      .post(
          "https://feel.upgradingdave.com/api/v1/feel-unary-tests/evaluate",
        {
          expression: expression,
          inputValue: parsedInputValue,
          context: parsedContext,
          metadata: {
            ...metadata,
          },
        },
        {
          headers: {
            accept: "*/*",
            "content-type": "application/json",
          },
        }
      )
      .then((response) => {
        if (response?.data?.error) {
          const errorMessage = response.data.error;
          const match = errorPattern.exec(errorMessage);
          onError({
            message: errorMessage,
            line: match?.groups?.line,
            position: match?.groups?.position,
          }, response.data.warnings);
        } else {
          onResult(response.data);
        }
      });
  }

  function onResult(data) {
    setError(null);

    const result = JSON.stringify(data.result);
    setResult(result);

    if (data.warnings.length >= 1) {
      setWarnings(data.warnings);
    }

    if (onResultCallback) {
      onResultCallback(result);
    }
  }

  function onError(error, warnings) {
    setResult(null);
    setError(error);
    setWarnings(warnings);

    if (onErrorCallback) {
      onErrorCallback(error);
    }
  }

  const resultTitle = () => {
    const onLine = error?.line ? ` on line ${error.line}` : "";
    const atPosition = error?.position ? ` at position ${error.position}` : "";
    return error && `Error${onLine}${atPosition}`;
  };

  return (
    <div>
      <h2>Expression</h2>
      <Editor onChange={setExpression} language="js">
        {expression}
      </Editor>

      <h2>Input value</h2>
      <Editor onChange={setInputValue} language="json">
        {inputValue}
      </Editor>

      {feelContext && (
        <div>
          <h2>Context</h2>
          <i>
            A JSON document that is used to resolve <strong>variables</strong>{" "}
            in the expression.
          </i>
          <Editor onChange={setContext} language="json">
            {context}
          </Editor>
        </div>
      )}

      <button
        onClick={tryEvaluate}
        className="button button--primary button--lg"
      >
        Evaluate
      </button>

      <br />
      <br />
      <h2>Result</h2>
      <CodeBlock title={resultTitle()} language="json">
        {result || error?.message}
      </CodeBlock>
      <br />
      <h2>Warnings</h2>
      <CodeBlock>
        {warnings?.map((item,i) =>
          <li key={i}>[{item.type}] {item.message}</li>) || "<none>"}
      </CodeBlock>

    </div>
  );
};

export default LiveFeelUnaryTests;
