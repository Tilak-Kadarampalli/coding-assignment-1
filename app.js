const express = require("express");
const path = require("path");
const sqlite3 = require("sqlite3");
const { open } = require("sqlite");
var isValid = require("date-fns/isValid");
const app = express();
app.use(express.json());

var format = require("date-fns/format");
var parseISO = require("date-fns/parseISO");

let db = null;
const dbPath = path.join(__dirname, "todoApplication.db");

const initializeDBAndServer = async () => {
  try {
    db = await open({ filename: dbPath, driver: sqlite3.Database });
    app.listen(3000, () => {
      console.log("Server is running at port 3000");
    });
  } catch (e) {
    console.log(e.message);
    process.exit(1);
  }
};
initializeDBAndServer();

const convertDbObjectToResponseObject = (dbObject) => {
  return {
    id: dbObject.id,
    todo: dbObject.todo,
    priority: dbObject.priority,
    status: dbObject.status,
    category: dbObject.category,
    dueDate: dbObject.due_date,
  };
};

const middleware = (request, response, next) => {
  const requestQuery = request.query;
  const categories = ["LEARNING", "WORK", "HOME"];
  const priorities = ["HIGH", "LOW", "MEDIUM"];
  const statuses = ["TO DO", "IN PROGRESS", "DONE"];
  let { category, priority, status, date } = requestQuery;

  if (category != undefined) {
    if (categories.includes(category) === false) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
  if (priority != undefined) {
    if (priorities.includes(priority) === false) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }
  if (status != undefined) {
    if (statuses.includes(status) === false) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (date != undefined) {
    date = parseISO(date);
    if (isValid(date) === false) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  next();
};

const acceptWare = (request, response, next) => {
  const requestQuery = request.body;
  const categories = ["LEARNING", "WORK", "HOME"];
  const priorities = ["HIGH", "LOW", "MEDIUM"];
  const statuses = ["TO DO", "IN PROGRESS", "DONE"];
  let { category, priority, status, dueDate } = requestQuery;

  if (category != undefined) {
    if (categories.includes(category) === false) {
      response.status(400);
      response.send("Invalid Todo Category");
      return;
    }
  }
  if (priority != undefined) {
    if (priorities.includes(priority) === false) {
      response.status(400);
      response.send("Invalid Todo Priority");
      return;
    }
  }
  if (status != undefined) {
    if (statuses.includes(status) === false) {
      response.status(400);
      response.send("Invalid Todo Status");
      return;
    }
  }
  if (dueDate != undefined) {
    dueDate = parseISO(dueDate);
    if (isValid(dueDate) === false) {
      response.status(400);
      response.send("Invalid Due Date");
      return;
    }
  }
  next();
};

//API 1
app.get("/todos/", middleware, async (request, response) => {
  let {
    status = "",
    priority = "",
    search_q = "",
    category = "",
  } = request.query;
  status = status.replace("%20", " ");
  const getTodoQuery = `SELECT * FROM todo WHERE 
    status LIKE '%${status}%' AND
    priority LIKE '%${priority}%' AND 
    todo LIKE '%${search_q}%' AND 
    category LIKE '%${category}%';`;
  const todoArray = await db.all(getTodoQuery);
  const todoObjects = todoArray.map((each) =>
    convertDbObjectToResponseObject(each)
  );
  response.send(todoObjects);
});

//API 2
app.get("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const getTodoIdQuery = `SELECT * FROM todo WHERE id = ${todoId};`;
  const todoObject = await db.get(getTodoIdQuery);
  response.send(convertDbObjectToResponseObject(todoObject));
});

//API 3
app.get("/agenda/", middleware, async (request, response) => {
  let { date } = request.query;
  date = parseISO(date);
  const dateFormat = format(date, "yyyy-MM-dd");
  const getDateQuery = `SELECT * FROM todo WHERE due_date = '${dateFormat}' ORDER BY id;`;
  const todoArray = await db.all(getDateQuery);
  const todoObjects = todoArray.map((each) =>
    convertDbObjectToResponseObject(each)
  );
  response.send(todoObjects);
});

//API 4
app.post("/todos/", acceptWare, async (request, response) => {
  const todoDetails = request.body;
  let { id, todo, priority, status, category, dueDate } = todoDetails;

  const postTodoQuery = `INSERT INTO todo 
  (id,todo,priority,status,category,due_date)
  VALUES (${id},'${todo}','${priority}','${status}','${category}','${dueDate}');`;
  const dbResponse = await db.run(postTodoQuery);
  response.send("Todo Successfully Added");
});

//API 5
app.put("/todos/:todoId", acceptWare, async (request, response) => {
  const { todoId } = request.params;
  const putRequest = request.body;
  let parameter;
  let updatedValue;
  let updateMsg;
  if (putRequest.status != undefined) {
    parameter = "status";
    updatedValue = putRequest.status;
    updateMsg = "Status";
  } else if (putRequest.priority != undefined) {
    parameter = "priority";
    updatedValue = putRequest.priority;
    updateMsg = "Priority";
  } else if (putRequest.todo != undefined) {
    parameter = "todo";
    updatedValue = putRequest.todo;
    updateMsg = "Todo";
  } else if (putRequest.category != undefined) {
    parameter = "category";
    updatedValue = putRequest.category;
    updateMsg = "Category";
  } else if (putRequest.dueDate != undefined) {
    parameter = "due_date";
    updatedValue = putRequest.dueDate;
    updatedValue = parseISO(updatedValue);
    updatedValue = format(updatedValue, "yyyy-MM-dd");
    updateMsg = "Due Date";
  }
  const putTodoQuery = `UPDATE todo SET
    ${parameter} = '${updatedValue}' WHERE 
    id = ${todoId};`;
  await db.run(putTodoQuery);
  response.send(`${updateMsg} Updated`);
});

//API 6
app.delete("/todos/:todoId/", async (request, response) => {
  const { todoId } = request.params;
  const deleteTodoQuery = `DELETE FROM todo
    WHERE id = ${todoId};`;
  await db.run(deleteTodoQuery);
  response.send("Todo Deleted");
});

module.exports = app;
