import {exec, spawn} from 'child_process';
import path from 'path';

export function buildProject(id: string, buildCommand: string, installCommand: string) {
    return new Promise((resolve, ) => {
        console.log("Building project")

        // TODO: Sanitize so it doesn't execute "dangerous" commands
        const child = exec(`cd ${path.join(__dirname, `output/${id}`)} && ${installCommand} && ${buildCommand}`)

        child.stdout?.on('data', function(data) {
            console.log('stdout: ' + data);
        });
        child.stderr?.on('data', function(data) {
            console.log('stderr: ' + data);
        })
        child.on('close', function(code) {
            if (code === 0) {
                resolve("");
                return code
            } else {
                console.error(`Build failed with code ${code}`)
                resolve("")
                return code
            }
        })
    })
}

export function removeOutputs(id: string) {
    return new Promise((resolve) => {
        const child = spawn('rm', ['-rf', path.join(__dirname, `output/${id}`)])

        child.stdout?.on('data', function(data) {
            console.log('stdout: ' + data);
        });
        child.stderr?.on('data', function(data) {
            console.log('stderr: ' + data);
        })
        child.on('close', function(code) {
            resolve("");
        })
    })
}