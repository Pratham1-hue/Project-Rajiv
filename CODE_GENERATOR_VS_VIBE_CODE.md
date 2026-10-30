# Code Generator vs Vibe Code Generator

## Quick Comparison

| Feature | Code Generator | Vibe Code Generator |
|---------|---|---|
| **How you input** | Type/dictate a description | Choose a "vibe" or personality |
| **Example input** | "Create a function that validates email" | "Pragmatic", "Minimalist", "Optimistic" |
| **Code style** | Whatever you describe | Specific personality/style |
| **Use case** | "I need specific functionality" | "I want this coded in a certain way" |
| **Complexity** | Direct requirement | Context-aware generation |

---

## Code Generator (Alt+G)

### What It Does
Generates code based on **what you want it to do** - the functionality.

### How to Use
1. Press **Alt+G**
2. Type or speak what you want:
   - "Create a function that validates email addresses"
   - "Add a loop that processes all items in a list"
   - "Write a class for managing user accounts"
3. Press "Generate & Read Summary"
4. Claude creates code matching your description

### Examples
```
Input: "Create a function that takes a list of numbers and returns only the even ones"
Output: 
def filter_even_numbers(numbers):
    return [n for n in numbers if n % 2 == 0]
```

### Best For
- ✅ Getting specific functionality
- ✅ Quick code snippets
- ✅ Standard implementations
- ✅ Learning patterns

### Voice Support
- 🎤 Click microphone button or press **Alt+M**
- Dictate your requirement naturally
- Text appears automatically

---

## Vibe Code Generator (Alt+B)

### What It Does
Generates code with a **specific personality or coding style** based on current code context.

### How to Use
1. Press **Alt+B**
2. Choose a preset vibe OR describe a custom one:
   - **Pragmatic** - Production-ready, tested, reliable
   - **Minimalist** - Clean, concise, essential only
   - **Optimistic** - Friendly, upbeat, helpful comments
   - **Experimental** - Creative, modern patterns, cutting-edge
3. Or type custom: "bubbly and colorful", "strict and formal"
4. Press "Generate Code With This Vibe"
5. Claude generates code matching that personality

### Examples

**Same requirement, different vibes:**

**Pragmatic Vibe:**
```python
def calculate_total(items):
    """Calculate total cost with tax."""
    if not items:
        return 0.0
    subtotal = sum(item['price'] for item in items)
    tax = subtotal * 0.08
    return round(subtotal + tax, 2)
```

**Minimalist Vibe:**
```python
def calculate_total(items):
    return round(sum(i['price'] for i in items) * 1.08, 2) if items else 0.0
```

**Optimistic Vibe:**
```python
def calculate_total(items):
    """Calculate the awesome total! 🎉
    
    Handles all items with care and precision.
    Returns the grand total with tax included.
    """
    if not items:
        print("No items yet - let's add some! 😊")
        return 0.0
    
    subtotal = sum(item['price'] for item in items)
    tax = subtotal * 0.08
    total = round(subtotal + tax, 2)
    print(f"Total ready: ${total} ✨")
    return total
```

### Best For
- ✅ Matching your codebase style
- ✅ Learning different programming approaches
- ✅ Consistency across code
- ✅ Code reviews (formal vs casual)
- ✅ Teaching different styles
- ✅ Exploring alternatives

---

## Real-World Example

### Scenario
You're building a payment processor and need to validate credit card numbers.

### Using Code Generator
```
Input: "Write a function to validate credit card numbers"
Output: Standard validation function with Luhn algorithm
```

### Using Vibe Code Generator
```
Input 1: "Pragmatic" vibe
Output: Production-ready with error handling, logging, tests

Input 2: "Minimalist" vibe
Output: Elegant one-liner with mathematical perfection

Input 3: "Experimental" vibe  
Output: Functional programming approach, type hints, decorators
```

---

## When to Use Which

### Choose **Code Generator** (Alt+G) when you:
- 📝 Know exactly what you want
- 🎯 Need specific functionality
- ⚡ Want quick implementation
- 🗣️ Want to dictate requirements

### Choose **Vibe Code Generator** (Alt+B) when you:
- 🎨 Want different coding styles
- 🔄 Need consistency with existing code
- 🧪 Exploring alternative approaches
- 📚 Learning different patterns
- 🎭 Want personality in code (comments, style)

---

## Technical Details

### Code Generator
- **Input**: Natural language description
- **Claude's task**: Understand requirement and code it
- **Context**: Current code, file type, cursor position
- **Output**: Functional code matching description

### Vibe Code Generator
- **Input**: Personality/style descriptor + current code
- **Claude's task**: Generate code with specific personality while solving the problem
- **Context**: Current code, file type, cursor position, vibe
- **Output**: Code that both solves problem AND matches personality

---

## Keyboard Shortcuts

| Action | Shortcut |
|--------|----------|
| Open Code Generator | **Alt+G** |
| Voice input (in Code Gen) | **Alt+M** |
| Open Vibe Code | **Alt+B** |
| Accept generated code | **Enter** |
| Reject | **Escape** |

---

## Examples You Can Try

### Code Generator
- "Create a function that checks if a password is strong"
- "Write code to sort an array in descending order"
- "Add a comment parser that extracts TODO items"

### Vibe Code Generator
- Pragmatic vibe: "Validate user input"
- Minimalist vibe: "Validate user input"
- Experimental vibe: "Validate user input"
- Custom: "funny and sarcastic" validation function

---

## Summary

**Code Generator** = "What should I build?"  
**Vibe Code Generator** = "How should I build this?"

Use both together:
1. Get the basic functionality with Code Generator
2. Refactor with different vibes using Vibe Code Generator
3. Pick the style that fits your project best

Happy coding! 🚀
