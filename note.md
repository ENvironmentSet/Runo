# Runo design note

루노(Runo)는 아두이노 우노 보드 프로그래밍을 위한 도메인 특화 언어입니다.
함수형 반응형 프로그래밍과 함수형 프로그래밍에 기반한 고수준의 추상화를 제공하여 프로그래머가 본질적인 문제에 더 집중할 수 있게 해줍니다.

> 대부분의 아두이노 프로젝트에서 컴퓨팅 자원은 차고 넘칩니다. 그 작고 단순한 동작을 위해 번거롭기 그지없는 C++를 사용해야 할 이유가 있을까요?

## Values

> 루노에서 모든 값은 0인수 함수(또는 다변수 상수함수)로 취급됩니다.
> 루노에서 모든 값과 바인딩은 불변입니다.

- Number
- Text
- Boolean
- Tuple
- Function
- Event
- Observable

## Number

루노에서 모든 수는 BigFloat이라고도 알려진 임의 배정도 실수 형식으로 표현됩니다.
리터럴로는 10진수 리터럴을 지원합니다.

## Text

문자들의 열인 데이터로 다른 언어에서는 문자열이라 부르는 유형의 값입니다.
홑따옴표로 문자의 열을 둘러싸는 형태의 리터럴을 지원하며, 이스케이프 시퀸스도 지원합니다.

## Boolean

부울 대수의 값들입니다.

## Tuple

순서쌍입니다. 대괄호와 쉼표를 사용한 리터럴 형식을 지원합니다.

### Naming element

```
[a=1, b=2, 3, 4]
```

## Function

함수입니다. 오토 커링이 적용되어 있습니다.

```
\x y -> 1
```

### Constructor(Custom Literal)

```
Term Nil
Term Cons x y
```

### Pattern Match

```
match term with
  Nil -> exp
  Cons x y -> exp  
```

### Ops-correspond functions

primitive operations are lifted.

## Event

Discrete stream of Event occurrence

## Observable

Continuous stream of value

> **NOTE**: FFI for creating event and observable exist.

## Binding

```
name : exp
```

> NOTE: selector support.

## Flow programming

```
[Stream] [\{ ops \}] [Drivers]

```

ops only -> custom ops
Stream/Driver only -> alias
S ops -> new stream
ops d -> new driver
S ops D -> flow. (cannot be used in other program. naming only for debug)

custom ops available.
{} is id ops.

### Driver

linker for outside world.

#### Default drivers

- Serial
- Pins

#### Selector

enhanced identifier.

```
abc // shortcut for id
.class // logical class
#id
[key=val] // attribute
```

### Ops

Primitive operations of FRP.
almost same as Sodium-FRP's. but doesn't discriminate Cell and Event.

## if-then-else

```
if exp then exp else exp
```

## Constants

Arduino Constants

## Comment

C-Style.

## Setup file

-> Define custom driver
-> Define custom function

----

more literals, primitive math operators.
type system.