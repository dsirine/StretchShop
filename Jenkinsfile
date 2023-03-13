pipeline {
  environment {
    PATH = "$PATH:/usr/local/bin"
  }
  agent any
  stages {
    stage('Cloning Git') {
      steps {
        git 'https://github.com/dsirine/StretchShop.git'
      }
    }
    stage('Build') {
       steps {
        echo "PATH is: $PATH"
        sh '/usr/local/bin/docker-compose up'
       }
    }
    stage('Test') {
      steps {
        sh 'docker-compose up'
      }
    }
  }
}
