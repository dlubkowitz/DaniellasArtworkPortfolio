const express = require("express");
const expressHandlebars = require("express-handlebars");
const sqlite3 = require("sqlite3");
const expressSession = require("express-session");
const bcrypt = require("bcryptjs");

const db = new sqlite3.Database("DaniellasArtworkPortfolioDatabase.db");

const app = express();

const adminUsername = "admin";
const adminPassword =
  "$2a$08$q6sLDDEzQ2wa8tS/xjeMYeHCn36EuJ2hS9YrMN41k90RtPWasikMS";

const maxTitleLength = 50;
const maxDescriptionLength = 300;
const maxQuestionLength = 100;
const minQuestionLength = 10;
const maxNewQuestionLength = 100;
const minNewQuestionLength = 10;
const maxNameLength = 30;
const maxCommentLength = 300;
const maxReplyLength = 300;

db.run(`
  CREATE TABLE IF NOT EXISTS artworks (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT,
    description TEXT,
    imageURL TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS faqs (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    question TEXT,
    answer TEXT
  )
`);

db.run(`
  CREATE TABLE IF NOT EXISTS comments (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT,
    comment TEXT,
    reply TEXT
  )
`);

app.use(
  expressSession({
    secret: "dfgfsdjfljoeksdk",
    saveUninitialized: false,
    resave: false,
  })
);

app.engine(
  "hbs",
  expressHandlebars.engine({
    defaultLayout: "main.hbs",
  })
);

app.use(express.static("public"));

app.use(
  express.urlencoded({
    extended: false,
  })
);

app.use(function (request, response, next) {
  const isLoggedIn = request.session.isLoggedIn;
  response.locals.isLoggedIn = isLoggedIn;

  next();
});

app.get("/", function (request, response) {
  response.render("start.hbs");
});

app.get("/artworks", function (request, response) {
  const query = `SELECT * FROM artworks`;

  db.all(query, function (error, artworks) {
    const model = {
      artworks,
    };

    response.render("artworks.hbs", model);
  });
});

app.get("/updateArtwork/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM artworks WHERE id = ?`;
  const values = [id];

  db.get(query, values, function (error, artwork) {
    const model = {
      artwork,
    };

    response.render("updateArtwork.hbs", model);
  });
});

app.post("/updateArtwork/:id", function (request, response) {
  const id = request.params.id;

  const newTitle = request.body.title;
  const newDescription = request.body.description;
  const newImageURL = request.body.imageURL;

  const errorMessages = getErrorMessagesForArtwork(
    newTitle,
    newDescription,
    newImageURL
  );

  const isLoggedInErrorMessage = [];

  if (!request.session.isLoggedIn) {
    isLoggedInErrorMessage.push(
      "You have to be logged in to update an artwork post."
    );
  }

  if (errorMessages.length == 0 && isLoggedInErrorMessage == 0) {
    const query = `UPDATE artworks SET title = ?, description = ?, imageURL = ? WHERE id = ?`;
    const values = [newTitle, newDescription, newImageURL, id];

    db.run(query, values, function (error) {
      if (error) {
        console.log(error);
      } else {
        response.redirect("/artworks/" + id);
      }
    });
  } else {
    const model = {
      errorMessages,
      isLoggedInErrorMessage,
      artwork: {
        title: newTitle,
        description: newDescription,
        imageURL: newImageURL,
      },
    };
    response.render("updateArtwork.hbs", model);
  }
});

app.post("/deleteArtwork/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM artworks WHERE id = ?`;

  db.run(query, id, function (error) {
    response.redirect("/artworks");
  });
});

app.get("/artworks/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM artworks WHERE id = ?`;
  const values = [id];

  db.get(query, values, function (error, artwork) {
    const model = {
      artwork,
    };

    response.render("artwork.hbs", model);
  });
});

app.get("/createArtworkPost", function (request, response) {
  response.render("createArtworkPost.hbs");
});

function getErrorMessagesForArtwork(title, description, imageURL) {
  const errorMessages = [];

  if (title == "") {
    errorMessages.push("Title must contain at least 1 character.");
  }
  if (title.length == maxTitleLength) {
    errorMessages.push("Title must contain less than 50 characters.");
  }
  if (description == "") {
    errorMessages.push("Description must contain at least 1 character.");
  }
  if (description.length == maxDescriptionLength) {
    errorMessages.push("Description must contain less than 300 characters.");
  }
  if (imageURL == "") {
    errorMessages.push("Artwork URL must contain a link to an image.");
  }

  return errorMessages;
}

app.post("/createArtworkPost", function (request, response) {
  const title = request.body.title;
  const description = request.body.description;
  const imageURL = request.body.imageURL;

  const errorMessages = getErrorMessagesForArtwork(
    title,
    description,
    imageURL
  );

  const isLoggedInErrorMessage = [];

  if (!request.session.isLoggedIn) {
    isLoggedInErrorMessage.push(
      "You have to be logged in to create an artwork post."
    );
  }

  if (errorMessages.length == 0 && isLoggedInErrorMessage.length == 0) {
    const query = `
    INSERT INTO artworks (title, description, imageURL) VALUES (?, ?, ?)
  `;
    const values = [title, description, imageURL];

    db.run(query, values, function (error) {
      response.redirect("/artworks");
    });
  } else {
    const model = {
      errorMessages,
      isLoggedInErrorMessage,
      title,
      description,
      imageURL,
    };
    response.render("createArtworkPost.hbs", model);
  }
});

app.get("/about", function (request, response) {
  response.render("about.hbs");
});

app.get("/comments", function (request, response) {
  const query = `SELECT * FROM comments`;

  db.all(query, function (error, comments) {
    const model = {
      comments,
    };

    response.render("comments.hbs", model);
  });
});

app.get("/createComment", function (request, response) {
  response.render("createComment.hbs");
});

function getErrorMessagesForComments(name, comment) {
  const errorMessages = [];

  if (name == "") {
    errorMessages.push("Name must contain at least 1 character.");
  }
  if (name.length == maxNameLength) {
    errorMessages.push("Name must contain less than 20 characters.");
  }
  if (comment == "") {
    errorMessages.push("Comment must contain at least 1 character.");
  }
  if (comment.length == maxCommentLength) {
    errorMessages.push("Comment must contain less than 300 characters.");
  }

  return errorMessages;
}

app.post("/createComment", function (request, response) {
  const name = request.body.name;
  const comment = request.body.comment;

  const errorMessages = getErrorMessagesForComments(name, comment);
  const isLoggedInErrorMessage = [];

  if (request.session.isLoggedIn) {
    isLoggedInErrorMessage.push("You cannot post a comment as an admin.");
  }
  if (errorMessages.length == 0 && isLoggedInErrorMessage.length == 0) {
    const query = `
    INSERT INTO comments (name, comment) VALUES (?, ?)
  `;
    const values = [name, comment];

    db.run(query, values, function (error) {
      response.redirect("/comments");
    });
  } else {
    const model = {
      errorMessages,
      isLoggedInErrorMessage,
      name,
      comment,
    };
    response.render("createComment.hbs", model);
  }
});

app.post("/deleteComment/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM comments WHERE id = ?`;

  db.run(query, id, function (error) {
    response.redirect("/comments");
  });
});

app.get("/faqs", function (request, response) {
  const query = `SELECT * FROM faqs`;

  db.all(query, function (error, faqs) {
    const model = {
      faqs,
    };

    response.render("faqs.hbs", model);
  });
});

app.get("/askFAQ", function (request, response) {
  response.render("askFAQ.hbs");
});

function getErrorMessagesForFAQ(question) {
  const errorMessages = [];

  if (question.length < minQuestionLength) {
    errorMessages.push("Question must contain at least 10 characters.");
  }
  if (question.length == maxQuestionLength) {
    errorMessages.push("Question must contain less than 200 characters.");
  }

  return errorMessages;
}

app.post("/askFAQ", function (request, response) {
  const question = request.body.question;

  const errorMessages = getErrorMessagesForFAQ(question);

  const isLoggedInErrorMessage = [];

  if (request.session.isLoggedIn) {
    isLoggedInErrorMessage.push("The admin can not ask an FAQ.");
  }

  if (errorMessages.length == 0 && isLoggedInErrorMessage == 0) {
    const query = `
    INSERT INTO faqs (question) VALUES (?)
  `;
    const values = [question];

    db.run(query, values, function (error) {
      response.redirect("/faqs");
    });
  } else {
    const model = {
      errorMessages,
      isLoggedInErrorMessage,
      question,
    };
    response.render("askFAQ.hbs", model);
  }
});

app.get("/updateFAQ/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM faqs WHERE id = ?`;
  const values = [id];

  db.get(query, values, function (error, faqs) {
    const model = {
      faqs,
    };

    response.render("updateFAQ.hbs", model);
  });
});

function getErrorMessagesForUpdatedFAQ(newQuestion, newAnswer) {
  const errorMessages = [];

  if (newQuestion > maxNewQuestionLength) {
    errorMessages.push("Question must be less than 100 characters.");
  }
  if (newQuestion < minNewQuestionLength) {
    errorMessages.push("Question must contain at least 10 characters.");
  }
  if (newAnswer > maxReplyLength) {
    errorMessages.push("Answer must contain less than 300 characters.");
  }
  if (newAnswer == "") {
    errorMessages.push("Answer must contain at least 1 character.");
  }

  return errorMessages;
}

app.post("/updateFAQ/:id", function (request, response) {
  const id = request.params.id;

  const newQuestion = request.body.question;
  const newAnswer = request.body.answer;

  const errorMessages = getErrorMessagesForUpdatedFAQ(newQuestion, newAnswer);

  const isLoggedInErrorMessage = [];

  if (!request.session.isLoggedIn) {
    isLoggedInErrorMessage.push("You have to be logged in to update an FAQ.");
  }

  if (errorMessages.length == 0 && isLoggedInErrorMessage.length == 0) {
    const query = `UPDATE faqs SET question = ?, answer = ? WHERE id = ?`;
    const values = [newQuestion, newAnswer, id];

    db.run(query, values, function (error) {
      response.redirect("/faqs");
    });
  } else {
    const model = {
      isLoggedInErrorMessage,
      errorMessages,
      faqs: {
        question: newQuestion,
        answer: newAnswer,
      },
    };
    response.render("updateFAQ.hbs", model);
  }
});

app.get("/updateComments/:id", function (request, response) {
  const id = request.params.id;

  const query = `SELECT * FROM comments WHERE id = ?`;
  const values = [id];

  db.get(query, values, function (error, comments) {
    const model = {
      comments,
    };

    response.render("updateComments.hbs", model);
  });
});

function getErrorMessagesForUpdatedComments(newName, newComment, newReply) {
  const errorMessages = [];

  if (newName == "") {
    errorMessages.push("Name must contain at least 1 character.");
  }
  if (newName.length == maxNameLength) {
    errorMessages.push("Name must contain less than 30 characters.");
  }
  if (newComment.length > maxCommentLength) {
    errorMessages.push("Comment must contain less than 300 characters.");
  }
  if (newComment == "") {
    errorMessages.push("Comment must contain at least 1 character.");
  }
  if (newReply.length > maxReplyLength) {
    errorMessages.push("Reply must contain less than 300 characters.");
  }
  if (newReply == "") {
    errorMessages.push("Reply must contain at least 1 character.");
  }

  return errorMessages;
}

app.post("/updateComments/:id", function (request, response) {
  const id = request.params.id;

  const newName = request.body.name;
  const newComment = request.body.comment;
  const newReply = request.body.reply;

  const errorMessages = getErrorMessagesForUpdatedComments(
    newName,
    newComment,
    newReply
  );

  const isLoggedInErrorMessage = [];

  if (!request.session.isLoggedIn) {
    isLoggedInErrorMessage.push(
      "You have to be logged in to update a comment."
    );
  }

  if (errorMessages.length == 0 && isLoggedInErrorMessage.length == 0) {
    const query = `UPDATE comments SET name = ?, comment = ?, reply = ? WHERE id = ?`;
    const values = [newName, newComment, newReply, id];

    db.run(query, values, function (error) {
      response.redirect("/comments");
    });
  } else {
    const model = {
      errorMessages,
      isLoggedInErrorMessage,
      comments: {
        name: newName,
        comment: newComment,
        reply: newReply,
      },
    };
    response.render("updateComments.hbs", model);
  }
});

app.post("/deleteFaqs/:id", function (request, response) {
  const id = request.params.id;

  const query = `DELETE FROM faqs WHERE id = ?`;

  db.run(query, id, function (error) {
    response.redirect("/faqs");
  });
});

app.get("/contact", function (request, response) {
  response.render("contact.hbs");
});

app.get("/login", function (request, response) {
  response.render("login.hbs");
});

app.post("/login", function (request, response) {
  const enteredUsername = request.body.username;
  const enteredPassword = request.body.password;

  const errorMessages = [];

  if (enteredUsername == "") {
    errorMessages.push("Username cannot be empty.");
  }
  if (enteredUsername != adminUsername) {
    errorMessages.push("Username was incorrect.");
  }
  if (enteredPassword == "") {
    errorMessages.push("Password cannot be empty.");
  }
  if (enteredPassword != adminPassword) {
    errorMessages.push("Password is incorrect.");
  }

  if (enteredUsername == adminUsername) {
    bcrypt.compare(enteredPassword, adminPassword, function (error, result) {
      if (result) {
        request.session.isLoggedIn = true;
        response.redirect("/");
        console.log("True");
      } else {
        const model = {
          errorMessages,
        };
        response.render("login.hbs", model);
        console.log("False");
      }
    });
  } else {
    const model = {
      errorMessages,
    };
    response.render("login.hbs", model);
    console.log("False");
  }
});

app.get("/logout", function (request, response) {
  request.session.isLoggedIn = false;
  response.redirect("/");
});

app.listen(8080);
